import typing as t

import griffe


def build_signature(func: griffe.Function) -> str:
    parameters: t.List[griffe.Parameter] = func.parameters

    s = "("
    positional_only = True
    keyword_only = False
    for i, p in enumerate(parameters):
        if i != 0:
            s += ", "
        if p.kind in (
            griffe.ParameterKind.positional_or_keyword,
            griffe.ParameterKind.keyword_only,
        ):
            if positional_only and i != 0:
                s += "/, "
            positional_only = False

            if p.kind == griffe.ParameterKind.keyword_only:
                if not keyword_only:
                    s += "*, "
                keyword_only = True

        if p.kind == griffe.ParameterKind.var_keyword:
            s += f"**{p.name}"
        elif p.kind == griffe.ParameterKind.var_positional:
            s += f"*{p.name}"
        else:
            s += p.name
            if p.default is not None:
                s += f"={p.default}"

    s += ")"
    if func.returns:
        s += f" -> {func.returns}"

    return s


def filter_non_imported(d: t.Dict[str, griffe.Object]) -> dict:
    return {k: v for k, v in d.items() if not v.is_imported}


def stringify_expr(expr: griffe.Expr | str) -> str:
    if isinstance(expr, griffe.Expr):
        return expr.path
    return expr
