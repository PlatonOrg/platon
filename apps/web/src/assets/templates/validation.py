# Used with validation mode.

# Must answer the exercise in order to play the next one.
playPreviousIfUnplayed()
import random
import json

###
# Manage settings
###

# JSON for universal template information
try:
    JSON = json.load(open('includes/exercices.json', 'r')) # get the exercise
except:
    JSON = None

# CUSTOMGRADE for custom grade information
try:
    from includes.grader import customGradeManager
except:
    customGradeManager = None

ENVSET = load("ENVSET", False)
if not ENVSET:
    """
    Executed at the beginning of the activity. Do not re-execute afterward.
    It sets all information needed for the activity.
    """
    TOVALID = {}

    # check for universal template usage
    nbGroup = getGroupsCount()
    group0Name = getGroupName(0)
    if "template universel" == group0Name :
        HAS_UNIVERSAL_TEMPLATE = True
        if not customGradeManager:
            raise ValueError("Fonction 'customGradeManager' non trouvé.")
    else :
        HAS_UNIVERSAL_TEMPLATE = False

    # perform TOVALID initialisation
    for i in range(nbGroup):
        if  HAS_UNIVERSAL_TEMPLATE and i == 0 :
            continue # use the universal template so the first group is reserve for technical use
        groupIdStr = str(i)
        exercisesIndex = [i for i in range(getGroupExercisesCount(i))]
        # check for universal template
        if JSON and groupIdStr in JSON:
            useUniversalTemplate = True
            if "exercices" not in JSON[groupIdStr]:
                raise ValueError("Format invalide, 'exercices' non trouvé dans le fichier JSON des templates universels.")
            offset = len(exercisesIndex)
            exercisesIndex.extend([offset + i for i in range(len(JSON[groupIdStr]["exercices"]))])
        else:
            useUniversalTemplate = False
        if len(exercisesIndex) == 0:
            message = "Le groupe d'index : " + groupIdStr + " n'a pas d'exercice."
            raise ValueError(message)

        TOVALID[groupIdStr] = {
            "idGroup" : groupIdStr,
            "exercisesIndex" : exercisesIndex,
            "turn":0,
            "logs": {
                "info": {},
                "order": []
            },
            "useUniversalTemplate": useUniversalTemplate
        }
    save("TOVALID",TOVALID)
    save("VALID", {})
    save("HAS_UNIVERSAL_TEMPLATE", HAS_UNIVERSAL_TEMPLATE)
    save("ENVSET",True)

HAS_UNIVERSAL_TEMPLATE = load("HAS_UNIVERSAL_TEMPLATE", None)# never None because it was set in ENVSET

###
# Exercises logs
###

# Exercise settings for logs
lastGrade = getPreviousGrade() # grade of the exercise played
lastId = getPreviousExerciseId() # id of the exercise played, never None because of playPreviousIfUnplayed at the start
lastGroup = getPreviousGroupNumber()
evaluate = False # only evaluate exercise from TOVALID (if retry an exercise and fail student don't have do re-do everything for the group he validate)
if lastId :
    lastAttempts = getExerciseAttempts(lastId)
    metaInformation = getExerciseVariable(lastId, ".meta")
    lastHints = metaInformation["consumedHints"]

    if lastGroup == 0 and HAS_UNIVERSAL_TEMPLATE:
        # Manage universal template: retrieve the group stored in INFORMATIONS because the universal template is in group 0
        INFORMATIONS = getExerciseVariable(lastId, "INFORMATIONS")
        lastGroup = INFORMATIONS["group"]

    # Exercise log
    TOVALID = load("TOVALID", None) # At this step, TOVALID always exists, otherwise there is a major problem
    VALID = load("VALID", {})
    groupIdStr = str(lastGroup) # id for TOVALID dictionary
    if groupIdStr in TOVALID:
        evaluate = True
        group = TOVALID[groupIdStr]
        logs = group["logs"]
        if lastId in logs["info"]:
            # replay an exercise
            logs["info"][lastId]["attempts"] += lastAttempts
            logs["info"][lastId]["hints"] += lastHints
            if lastGrade > logs["info"][lastId]["grade"]:
                logs["info"][lastId]["grade"] = lastGrade
            logs["order"].remove(lastId)
            logs["order"].append(lastId)
        else :
            logs["info"][lastId] = {
                "indexSource": lastGroup,
                "id": lastId,
                "grade": lastGrade,
                "attempts": lastAttempts,
                "hints": lastHints,
                "error": metaInformation["error"]
            }
            logs["order"].append(lastId)
        TOVALID[groupIdStr] = group

###
# evaluate the group
###
def removeErrorExercise(logs):
    """
    Remove all exercises that have raised the "error" flag.
    """
    return [log for log in logs if not log["error"]]

def getMeanGrade(gradeInformation,logs):
    """
    indicate if the group is valid and it's grade if valid for the type "mean"
    parameters :
        - gradeInformation :
            type                        - 'empty' | 'mean' | 'success' : Success last 'exerciseCount' exercises had more than 'targetScore'.
            exerciseCount               - number : Take the last 'exerciseCount' exercises to verify the validation.
            targetScore                 - number : Mean score to get to validate the group
            maxAttempts                 - number : Maximum attempts on one exercise.

        - logs              - dictionary : Information on played exercise from this group.
            "info"              - dictionary : Information on the exercise.
                "indexSource"           - number : Index of the exercise in the group.
                "id"                    - uuid : Unique Id generate from the exercise.
                "grade"                 - number : The best grade of the exercise.
                "attempts"              - number : Attempts on the exercise.
                "hints"                 - number : Number of hint used for the exercise.
                "error"                 - boolean : Indicate if there is an technical issue with the exercise.
            "order"             - list of uuid  : list of the exercise id in order with the most recent played at the end of the list.
    returns :
        valid (bool),grade (number|None) : grade is None when the group is not validate
    """
    logs = removeErrorExercise(logs)
    if len(logs) < gradeInformation["exerciseCount"] :
        return False,None
    numerator = 0
    for log in logs[-gradeInformation["exerciseCount"]:]:
        if log["attempts"] > gradeInformation["maxAttempts"] :
            return False,None
        numerator += log["grade"]
    grade = round(numerator/gradeInformation["exerciseCount"])
    return True,grade if grade >=  gradeInformation["targetScore"] else False,None

def getSuccessGrade(gradeInformation,logs):
    """
    indicate if the group is valid and it's grade if valid for the type  "success"
    parameters :
        - gradeInformation :
            type                        - 'empty' | 'mean' | 'success' : Success last 'exerciseCount' exercises had more than 'targetScore'.
            exerciseCount               - number : Take the last 'exerciseCount' exercises to verify the validation.
            targetScore                 - number : Score needed on each exercise to validate the group.
            maxAttempts                 - number : Maximum attempts on one exercise.

        - logs              - dictionary : Information on played exercise from this group.
            "info"              - dictionary : Information on the exercise.
                "indexSource"           - number : Index of the exercise in the group.
                "id"                    - uuid : Unique Id generate from the exercise.
                "grade"                 - number : The best grade of the exercise.
                "attempts"              - number : Attempts on the exercise.
                "hints"                 - number : Number of hint used for the exercise..
                "error"                 - boolean : Indicate if there is a technical issue with the exercise.
            "order"             - list of uuid  : list of the exercise id in order with the most recent played at the end of the list.
    returns :
        valid (bool),grade (number|None) : grade is None when the group is not validate
    """
    logs = removeErrorExercise(logs)
    if len(logs) < gradeInformation["exerciseCount"] :
        return False,None
    numerator = 0
    for log in logs[-gradeInformation["exerciseCount"]:]:
        if log["attempts"] > gradeInformation["maxAttempts"] or log["grade"] < gradeInformation["targetScore"]:
            return False,None
        numerator += log["grade"]
    grade = round(numerator/gradeInformation["exerciseCount"])
    return True,grade

if lastId and evaluate:
    groupGradeInformation = getGroupGradeRules(lastGroup)
    gradeType = groupGradeInformation["type"]
    valid = None
    grade = None
    logsList = [logs["info"][exerciseId] for exerciseId in logs["order"]]
    if customGradeManager :
        valid,grade = customGradeManager(lastGroup,groupGradeInformation,logsList)
    if valid == None : # at this stage if it's None there is no custom validation rule for the group
        if gradeType == "mean":
            valid,grade = getMeanGrade(groupGradeInformation,logsList)
        elif gradeType == "success":
            valid,grade = getSuccessGrade(groupGradeInformation,logsList)
        elif gradeType == "empty":
            message = "Le groupe " + groupIdStr + " n'a pas de règle de validation."
            raise ValueError(message)
        else:
            message = str(gradeType) + " n'est pas un type pris en charge (groupe " + groupIdStr + ")."
            raise ValueError(message)
    if valid:
        if grade is None or 0 > grade or grade > 100:
            message = "Le groupe d'index " + groupIdStr + " est indiqué valide alors que la note ne l'est pas (" + str(grade) + ")."
            raise ValueError(message)
        group = TOVALID.pop(groupIdStr)
        group["grade"] = grade
        VALID[groupIdStr] = group

    save("VALID", VALID)

##
# exercise generation
##
def activityGradeFunction():
    """
    This is the function passed to setActivityGrade to calculate the final activity score.

    Each group has the same coefficient. It uses the score stored under the "grade"
    key from the information provided in the "VALID" dictionary.

    Returns:
        int: A grade between 0 and 100.
    """
    VALID = load("VALID", None)
    HAS_UNIVERSAL_TEMPLATE = load("HAS_UNIVERSAL_TEMPLATE", None)
    if not VALID or HAS_UNIVERSAL_TEMPLATE is None or len(VALID) == 0 or (len(VALID) == 1 and HAS_UNIVERSAL_TEMPLATE):
        raise ValueError("Aucun groupe validé, ou un problème avec l'utilisation des templates universels est survenu.")
    numerator = 0
    for group in VALID:
        info = VALID[group]
        if  HAS_UNIVERSAL_TEMPLATE and info["id"] == 0:
            continue
        numerator += info["grade"]
    denominator = (len(VALID) - 1) if HAS_UNIVERSAL_TEMPLATE else len(VALID)
    denominator += len(TOVALID)
    return round(numerator / denominator)

if not TOVALID:
    setActivityGrade(activityGradeFunction)
    stopActivity()

choosenGroupId = None
if isValidationModeRandom():
    choosenGroupId = random.choice(list(TOVALID.keys()))
else :
    choosenGroupId = sorted(list(TOVALID.keys()), key=int)[0]

UNIQUE_INDEX_EXERCISE = load("UNIQUE_INDEX_EXERCISE",0)
save("UNIQUE_INDEX_EXERCISE", UNIQUE_INDEX_EXERCISE + 1)
choosenGroup = TOVALID[choosenGroupId]
choosenExerciseId = choosenGroup["exercisesIndex"][choosenGroup["turn"] % len(choosenGroup["exercisesIndex"])]
choosenGroup["turn"] += 1
save("TOVALID", TOVALID)

DIC = {
    "UNIQUE_INDEX_EXERCISE": UNIQUE_INDEX_EXERCISE
}

if HAS_UNIVERSAL_TEMPLATE and choosenGroup >= getGroupExercisesCount(choosenGroupId):
    choosenJSONExercise = JSON[choosenGroup][ choosenExerciseId  - getGroupExercisesCount(choosenGroup)]
    DIC["JSONExercice"] = choosenJSONExercise
    DIC["INFORMATIONS"] = {"group" : choosenGroup}
    generateAndPlayExercise(getExerciseId(0,0),DIC)

generateAndPlayExercise(getExerciseId(choosenGroupId,choosenExerciseId), DIC)