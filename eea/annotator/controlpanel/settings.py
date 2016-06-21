""" Control Panel
"""
from plone.app.registry.browser import controlpanel
from eea.annotator.interfaces import ISettings
from eea.annotator.config import EEAMessageFactory as _


class EditForm(controlpanel.RegistryEditForm):
    """Control panel edit form.
    """

    schema = ISettings
    label = _(u"EEA Annotator Settings")
    description = _(u"EEA Annotator settings")


class ControlPanel(controlpanel.ControlPanelFormWrapper):
    """Control panel form wrapper.
    """

    form = EditForm
