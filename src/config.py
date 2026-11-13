import os

LIST_DIRECTORY = "data"

USERNAME_LIST_URL = (
    "https://raw.githubusercontent.com/WebBreacher/WhatsMyName/main/wmn-data.json"
)
USERNAME_LIST_FILENAME = "wmn-data.json"
USERNAME_LIST_PATH = os.path.join(os.getcwd(), LIST_DIRECTORY, USERNAME_LIST_FILENAME)
USERNAME_METADATA_LIST_FILENAME = "wmn-metadata.json"
USERNAME_METADATA_LIST_PATH = os.path.join(
    os.getcwd(), LIST_DIRECTORY, USERNAME_METADATA_LIST_FILENAME
)

EMAIL_LIST_FILENAME = "email-data.json"
EMAIL_LIST_PATH = os.path.join(os.getcwd(), LIST_DIRECTORY, EMAIL_LIST_FILENAME)

LOG_DIRECTORY = "logs"
LOG_FILENAME = "pikmist.log"
LOG_PATH = os.path.join(os.getcwd(), LOG_DIRECTORY, LOG_FILENAME)

ASSETS_DIRECTORY = "assets"
FONTS_DIRECTORY = "fonts"
IMAGES_DIRECTORY = "img"

FONT_REGULAR_FILE = "Montserrat-Regular.ttf"
FONT_BOLD_FILE = "Montserrat-Bold.ttf"
FONT_NAME_REGULAR = "Montserrat"
FONT_NAME_BOLD = "Montserrat-Bold"

aiModel = None
ai_analysis = None