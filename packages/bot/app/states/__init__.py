"""
FSM states for the submission wizard.
"""
from aiogram.fsm.state import State, StatesGroup


class SubmitStates(StatesGroup):
    waiting_for_url = State()
    waiting_for_photos = State()
