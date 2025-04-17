import argparse
import json
import os

import griffe
from griffe_typingdoc import TypingDocExtension

from .mksource import CustomEncoder, parse_module

DOCSTRING_TYPE = "google"
STORE_SOURCE = True

def generate() -> None:
    """Generate Python API documentation for a specified module.

    This function parses command-line arguments, loads the specified module,
    parses its content, and saves the generated API documentation as a JSON file.

    Args:
        None

    Returns:
        None

    Raises:
        argparse.ArgumentTypeError: If invalid arguments are provided.
        FileNotFoundError: If the specified module or output directory doesn't exist.
        PermissionError: If there's no write permission for the output directory.
    """
    parser = argparse.ArgumentParser(description="Generate python API documentation")
    parser.add_argument(
        "module", type=str, help="The module to generate documentation for"
    )
    parser.add_argument(
        "--dir",
        "-d",
        type=str,
        default=".",
        help="The directory to save the documentation in",
    )
    args = parser.parse_args()

    extensions = griffe.load_extensions(TypingDocExtension)
    pkg = parse_module(
        griffe.load(
            args.module, docstring_parser="auto", store_source=STORE_SOURCE, extensions=extensions
        )
    )
    api_filename = f"{args.module}.json"

    with open(os.path.join(args.dir, api_filename), "w") as file:
        json.dump(pkg, file, cls=CustomEncoder, indent=2, full=True)


if __name__ == "__main__":
    generate()
