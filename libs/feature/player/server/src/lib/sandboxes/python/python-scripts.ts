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
sys.path.append("/utils/libs/platon")
from PlatonLog import PlatonLog


class StopExec(Exception):
    """
    Exception class used to stop the execution of the script.
    """
    pass


def with_try_clause(code, excpt):
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

def component(selector):
    """
    Helper function exposed to builder/grader to creates a component object with a selector and a unique identifier.

    Args:
        selector (str): The selector for the component.

    Returns:
        Object: The component object with selector and cid attributes.
    """
    return {'selector': selector, 'cid': str(uuid.uuid4())}


def jsonify(d, keep_classes=True):
    """
    Serializes a dictionary object to JSON, excluding certain types.

    Args:
        d (dict): The dictionary object to be serialized.
        keep_classes (bool, optional): Specifies whether to include custom class objects in the serialization.
            Defaults to True.

    Returns:
        str: The JSON representation of the dictionary object.

    Notes:
        - Certain types, such as None and specific custom classes, are excluded from the serialization process.
          Custom classes that are subclasses of types.ModuleType or types.FunctionType are excluded by default.
          The purpose of this exclusion is to avoid potential serialization issues or undesired side effects.
          If 'keep_classes' is set to False, the excluded custom class objects will be removed from the input
          dictionary before serialization.
        - The resulting JSON string is generated using the jsonpickle library, which supports serializing complex
          Python objects, including custom classes and instances.

    Example:
        d = {
            'form': '{{input}}',
            'a': 10,
            'b': 20,
            'array': ['abc', 'def'],
            'object': {
                'a': 'AAA',
                'b': 'BBB'
            }
        }
        json_string = jsonify(d)
        # json_string contains the JSON representation of the dictionary object.

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







list_platon_logs = []
def platon_log(*args, **kwargs):
    """
    Helper function to log messages to the Platon platform console.

    Args:
        *args: Variable length argument list.
        **kwargs: Arbitrary keyword arguments.

    Notes:
        - This function is intended for use within the Platon platform environment to log messages to the console.
        - The function signature is similar to the built-in 'print' function in Python.
        - The messages logged using this function are displayed in the platform's console output.

    Example:
        platon_log("This is a log message.")
        platon_log("Value of x:", x)
    """
    list_platon_logs.append(' '.join(map(str, args)))

if __name__ == "__main__":
    """
    Main function to execute the script.

    Reads the script code from a file, executes it with provided variables, and serializes the resulting variables
    to a JSON file.

    The script code is read from the file "script.py", and the variables to be passed to the script are read from
    the file "variables.json". The script is executed within a modified namespace, where additional objects and
    classes (Object, component, StopExec) are available.

    The resulting variables after executing the script are serialized using the 'jsonify' function and written to
    an output file named "output.json".

    The function uses the jsonpickle library to handle the serialization of complex Python objects, ensuring
    compatibility with custom classes and instances.

    Note:
        - It is assumed that the script file ("script.py") and the variables file ("variables.json") exist in
          the same directory as this script.

    Example:
        Assuming the following files exist:
        - script.py: Contains the code to be executed.
        - variables.json: Contains the variables to be passed to the script.

        The script can be executed by running:
        $ python3 runner.py

        This will execute the script code, serialize the resulting variables, and save them in "output.json".
    """
    platon_logger = PlatonLog()
    with open("script.py", "r") as f:
            script = f.read()

    with open("variables.json", "r") as f:
        variables = json.load(f)

    glob = {}

    #variables.Object = Object
    variables['component'] = component
    variables['StopExec'] = StopExec
    variables['platon_log'] = platon_log
    try:
        exec(with_try_clause(script, StopExec), variables)
        exec("", glob)
    except Exception as e:
        # Ne pas catcher les erreurs de timeout - les laisser se propager
        def is_timeout_error(exception):
            """Détecte si une exception est liée à un timeout"""
            # Types de timeout connus
            timeout_types = [
                TimeoutError,
            ]

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

        if is_timeout_error(e):
            raise

        platon_logger.maxlog_exception(e)
        val = platon_logger.push2platonlog()
        platon_log(val)
    finally:
        variables['platon_logs'] = list_platon_logs

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
