"""
FSM states for the submission wizard.
"""
from aiogram.fsm.state import State, StatesGroup


class SubmitStates(StatesGroup):
    waiting_for_product = State()   # User is browsing/searching product list
    waiting_for_search = State()    # User typed a search query
    waiting_for_photos = State()    # Product selected, waiting for screenshots
