from __future__ import annotations
from importlib.metadata import version

import griffe

from .models import Class, Function, Module
from .simplify_docstring import simplify_docstring
from .utils import build_signature


def parse_module(m: griffe.Object) -> Module:
    if not isinstance(m, griffe.Module):
        raise ValueError("Module must be a module")

    out = simplify_docstring(m.docstring, m)
    res: Module = {
        "name": m.name,
        "path": m.path,
        "filepath": m.filepath,
        "description": out.description,
        "docstring": out.remainder,
        "attributes": out.attributes,
        "modules": {
            name: parse_module(value)
            for name, value in m.modules.items()
            if not value.is_alias
        },
        "classes": {
            name: parse_class(value)
            for name, value in m.classes.items()
            if not value.is_alias
        },
        "functions": {
            name: parse_function(value)
            for name, value in m.functions.items()
            if not value.is_alias
        },
    }
    if m.is_package:
        try:
            res["version"] = version(m.name)
        except AttributeError:
            res["version"] = "unknown"

    return res


def parse_class(c: griffe.Class) -> Class:
    out = simplify_docstring(c.docstring, c)
    res: Class = {
        "name": c.name,
        "path": c.path,
        "description": out.description,
        "parameters": out.parameters,
        "attributes": out.attributes,
        "docstring": out.remainder,
        "functions": {
            name: parse_function(value)
            for name, value in c.functions.items()
            if not value.is_alias
        },
        "source": c.source,
        "inherited_members": {},
    }
    for member in c.inherited_members.values():
        parent_path = ".".join(member.canonical_path.split(".")[:-1])
        member_info = {"kind": member.kind, "path": member.canonical_path}
        if parent_path not in res["inherited_members"]:
            res["inherited_members"][parent_path] = []
        res["inherited_members"][parent_path].append(member_info)
    return res


def parse_function(f: griffe.Function) -> Function:
    out = simplify_docstring(f.docstring, f)
    res: Function = {
        "name": f.name,
        "path": f.path,
        "signature": build_signature(f),
        "description": out.description,
        "parameters": out.parameters,
        "returns": out.returns,
        "docstring": out.remainder,
        "source": f.source,
    }
    return res
