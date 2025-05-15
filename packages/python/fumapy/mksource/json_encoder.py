import typing as t

import griffe
from _griffe.encoders import _json_encoder_map


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
