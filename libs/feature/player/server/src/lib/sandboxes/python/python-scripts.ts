export const pythonRunnerScript = `
#!/usr/bin/env python3
# coding: utf-8

import uuid
import sys
import json
import jsonpickle
import types
import sys
import os
from typing import Optional, Any
import traceback
from datetime import datetime, timezone

from PlatonLogger import platon_log, platon_log_exception, get_logs, clear_logs


class StopExec(Exception):
    """
    Exception class used to stop the execution of the script.
    """
    pass


def with_try_clause(code: str, excpt: type) -> str:
    """
    Wraps the given code with a try-except clause to catch a specific exception.

    Args:
        code (str): The code to be wrapped.
        excpt (Exception): The exception class to catch.

    Returns:
        str: The modified code with the try-except clause.
    """
    code = code.replace('\\t', '    ')
    return (
        "try:\\n    ...\\n"
        + '\\n'.join(["    " + line for line in code.split('\\n')])
        + "\\nexcept " + excpt.__name__ + ":\\n    pass"
    )


def component(selector: str) -> dict:
    """
    Helper function exposed to builder/grader to creates a component object
    with a selector and a unique identifier.

    Args:
        selector (str): The selector for the component.

    Returns:
        dict: The component object with selector and cid attributes.
    """
    return {'selector': selector, 'cid': str(uuid.uuid4())}


def jsonify(d: dict, keep_classes: bool = True) -> str:
    """
    Serializes a dictionary object to JSON, excluding certain types.

    Args:
        d (dict): The dictionary object to be serialized.
        keep_classes (bool, optional): Specifies whether to include custom class objects
            in the serialization. Defaults to True.

    Returns:
        str: The JSON representation of the dictionary object.

    Notes:
        - Certain types, such as None and specific custom classes, are excluded from
          the serialization process.
        - Custom classes that are subclasses of types.ModuleType or types.FunctionType
          are excluded by default.
    """
    exclude_types = [types.ModuleType, types.FunctionType]
    for k, v in list(d.items()):
        # exclude none and custom classes if needed
        if v is None or (not keep_classes and v.__class__ == type):
            del d[k]
            continue

        for t in exclude_types:
            if isinstance(v, t):
                del d[k]
                continue

    return jsonpickle.encode(d, unpicklable=False)


def is_timeout_error(exception: Exception) -> bool:
    """
    Détecte si une exception est liée à un timeout.

    Args:
        exception: L'exception à vérifier.

    Returns:
        bool: True si l'exception est un timeout, False sinon.
    """
    # Types de timeout connus
    timeout_types = [TimeoutError]

    # Importer et vérifier les types de timeout optionnels
    try:
        import socket
        timeout_types.append(socket.timeout)
    except (ImportError, AttributeError):
        pass

    try:
        import subprocess
        timeout_types.append(subprocess.TimeoutExpired)
    except (ImportError, AttributeError):
        pass

    try:
        import asyncio
        timeout_types.append(asyncio.TimeoutError)
    except (ImportError, AttributeError):
        pass

    try:
        import concurrent.futures
        timeout_types.append(concurrent.futures.TimeoutError)
    except (ImportError, AttributeError):
        pass

    # Vérifier si l'exception est un type de timeout connu
    for timeout_type in timeout_types:
        if isinstance(exception, timeout_type):
            return True

    # Vérifier si le nom de la classe contient "timeout"
    class_name = exception.__class__.__name__.lower()
    if 'timeout' in class_name:
        return True

    # Vérifier si le message d'erreur contient des mots-clés de timeout
    error_message = str(exception).lower()
    timeout_keywords = ['timeout', 'timed out', 'time out', 'deadline exceeded']
    for keyword in timeout_keywords:
        if keyword in error_message:
            return True

    return False

if __name__ == "__main__":
    """
    Main function to execute the script.

    Reads the script code from a file, executes it with provided variables,
    and serializes the resulting variables to a JSON file.
    """
    clear_logs()

    with open("script.py", "r") as f:
        script = f.read()

    with open("variables.json", "r") as f:
        variables = json.load(f)

    glob = {}


    # Injecter les helpers dans le namespace du script
    variables['component'] = component
    variables['StopExec'] = StopExec
    variables['platon_log'] = platon_log  # Fonction du module partagé

    try:
        exec(with_try_clause(script, StopExec), variables)
        exec("", glob)
    except Exception as e:
        # Ne pas catcher les erreurs de timeout - les laisser se propager
        if is_timeout_error(e):
            raise e

        platon_log_exception(e)
    finally:
        variables['platon_logs'] = get_logs()

        for key in glob:
            if key in variables and variables[key] == glob[key]:
                del variables[key]

        with open('output.json', 'w') as output:
            print(jsonify(variables, False), file=output)

    sys.exit(0)
`

export const pythonNextScript = `
#!/usr/bin/env python3
# coding: utf-8

with open('/utils/libs/platon/NextLib.py', 'r') as src:
    exec(src.read() + '\\n' + next)
`
