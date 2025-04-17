from __future__ import annotations
import typing as t

class Module(t.TypedDict):
    name: str
    path: str
    filepath: str
    description: str | None
    docstring: Docstring
    attributes: t.List[Attribute]
    modules: t.Dict[str, Module]
    classes: t.Dict[str, Class]
    functions: t.Dict[str, Function]
    version: t.Optional[str]


class Class(t.TypedDict):
    name: str
    path: str
    description: str | None
    parameters: t.List[Parameter]
    attributes: t.List[Attribute]
    docstring: Docstring
    functions: t.Dict[str, Function]
    source: str


class Function(t.TypedDict):
    name: str
    path: str
    signature: str
    description: str | None
    parameters: t.List[Parameter]
    returns: t.Dict[str, str | None]
    docstring: Docstring
    source: str


class DocstringSection(t.TypedDict):
    kind: str
    value: str | t.List[Parameter]


Docstring = t.List[DocstringSection]


class Parameter(t.TypedDict):
    name: str
    annotation: str
    description: str
    value: str


class Attribute(t.TypedDict):
    name: str
    annotation: str
    description: str
    value: str
