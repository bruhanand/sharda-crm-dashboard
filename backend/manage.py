#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import pkgutil

if not hasattr(pkgutil, "find_loader"):
    from importlib.util import find_spec

    def _find_loader(name, package=None):
        spec = find_spec(name, package)
        return spec.loader if spec else None

    pkgutil.find_loader = _find_loader


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdpl_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
