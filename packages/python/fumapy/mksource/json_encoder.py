import typing as t
from pathlib import Path, PosixPath, WindowsPath
import griffe

_json_encoder_map: dict[type, t.Callable[[t.Any], t.Any]] = {
    Path: str,
    PosixPath: str,
    WindowsPath: str,
    set: sorted,
}


class CustomEncoder(griffe.JSONEncoder):
    def default(self, obj: t.Any) -> t.Any:
        """Return a serializable representation of the given object.

        Parameters:
            obj: The object to serialize.

        Returns:
            A serializable representation.
        """

        try:
            if isinstance(obj, griffe.Expr):
                return str(obj)
            return obj.as_dict(full=self.full)
        except AttributeError:
            return _json_encoder_map.get(type(obj), super().default)(obj)
