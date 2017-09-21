""" Control Panel
"""
from zope.component import queryUtility
from zope.interface import implementer
from plone.app.registry.browser import controlpanel
from plone.registry.interfaces import IRegistry
from eea.annotator.interfaces import ISettings
from eea.annotator.config import EEAMessageFactory as _


class EditForm(controlpanel.RegistryEditForm):
    """ Control panel edit form
    """

    schema = ISettings
    label = _(u"EEA Annotator Settings")
    description = _(u"EEA Annotator settings")


class ControlPanel(controlpanel.ControlPanelFormWrapper):
    """ Control panel form wrapper
    """

    form = EditForm


@implementer(ISettings)
class ControlPanelAdapter(object):
    """ Settings adapter
    """

    def __init__(self, context):
        self.context = context
        self._settings = None

    def __getattr__(self, name):
        return getattr(self.settings, name, None)

    @property
    def settings(self):
        """ Settings
        """
        if self._settings is None:
            self._settings = queryUtility(
                IRegistry).forInterface(ISettings, None)
        return self._settings

    @property
    def disabled(self):
        """ Check if inline comments are disabled for current context
        """
        context_type = getattr(self.context, 'portal_type', None)
        enabled_types = self.settings.portalTypes if self.settings else None
        if isinstance(enabled_types, list) and context_type in enabled_types:
            return False
        return True

    @property
    def exactMatch(self):
        """ Check if exact-match is enabled for current context
        """
        context_type = getattr(self.context, 'portal_type', None)
        no_exact_match = self.settings.noExactMatch if self.settings else None
        if isinstance(no_exact_match, list) and context_type in no_exact_match:
            return False
        return True
