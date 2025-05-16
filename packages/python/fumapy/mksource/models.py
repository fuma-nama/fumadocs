from __future__ import annotations

import typing as t


class Module(t.TypedDict):
    name: str
    path: str
    filepath: str
    description: str | None
    docstring: Docstring
    attributes: list[Attribute]
    modules: dict[str, Module]
    classes: dict[str, Class]
    functions: dict[str, Function]
    version: str | None


class Class(t.TypedDict):
    name: str
    path: str
    description: str | None
    parameters: list[Parameter]
    attributes: list[Attribute]
    docstring: Docstring
    functions: dict[str, Function]
    source: str


class Function(t.TypedDict):
    name: str
    path: str
    signature: str
    description: str | None
    parameters: list[Parameter]
    returns: dict[str, str | None]
    docstring: Docstring
    source: str


class DocstringSection(t.TypedDict):
    kind: str
    value: str | list[Parameter]


Docstring = list[DocstringSection]


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
