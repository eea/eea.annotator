""" Schema extender for Disable Autolinks for context/page
"""
from zope.interface import implements
from zope.component import queryAdapter
from zope.component import queryUtility
from zope.component.hooks import getSite
from Products.Archetypes.public import BooleanField, BooleanWidget
from plone.registry.interfaces import IRegistry
from archetypes.schemaextender.interfaces import ISchemaExtender
from archetypes.schemaextender.interfaces import IBrowserLayerAwareExtender
from archetypes.schemaextender.field import ExtensionField
from eea.annotator.config import EEAMessageFactory as _
from eea.annotator.interfaces import ILayer
from eea.annotator.controlpanel.interfaces import ISettings


class EEABooleanField(ExtensionField, BooleanField):
    """ BooleanField for schema extender
    """


class EEASchemaExtender(object):
    """ Schema extender for inline comment fields
    """
    implements(ISchemaExtender, IBrowserLayerAwareExtender)
    layer = ILayer

    fields = (
        EEABooleanField(
            name='disableAnnotator',
            schemata='settings',
            default=False,
            searchable=False,
            widget=BooleanWidget(
                label=_('Disable inline comments'),
                description=_("Do not allow editors to add inline comments on "
                              "this context/page"),
            )
        ),
        EEABooleanField(
            name='readOnlyAnnotator',
            schemata='settings',
            default=False,
            searchable=False,
            widget=BooleanWidget(
                label=_('Read-only inline comments'),
                description=_("Make inline comments read-only"),
            )
        ),
    )

    def __init__(self, context):
        self.context = context

    @property
    def disabled(self):
        context_type = getattr(self.context, 'portal_type', None)
        settings = queryUtility(IRegistry).forInterface(ISettings, None)
        enabled_types = settings.portalTypes if settings else None
        if isinstance(enabled_types, list) and context_type in enabled_types:
            return False
        return True

    def getFields(self):
        """ Returns provenance list field
        """
        if not self.disabled:
            return self.fields
        return ()
