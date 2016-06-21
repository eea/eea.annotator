""" Portlets
"""
from z3c.form import field
from zope import schema
from zope.component import getMultiAdapter
from zope.component import queryAdapter
from zope.component import queryUtility
from zope.interface import implements
from zope.security import checkPermission

from plone.app.portlets.portlets import base
try:
    # Plone 4
    from plone.app.portlets.browser import z3cformhelper as base_
except ImportError:
    # Plone 5
    base_ = base
from plone.portlets.interfaces import IPortletDataProvider
from plone.registry.interfaces import IRegistry
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

from eea.annotator.config import EEAMessageFactory as _
from eea.annotator.controlpanel.interfaces import ISettings
from eea.annotator.interfaces import IAnnotatorStorage


class IAnnotatorPortlet(IPortletDataProvider):
    """ Annotator portlet
    """
    label = schema.TextLine(
        title=_(u"Porlet title"),
        description=_(u"Title of the portlet. Leave empty if you don't want "
                      u"to display a title for this portlet"),
        default=u"Inline comments",
        required=False
    )


class Assignment(base.Assignment):
    """ Assignment
    """
    implements(IAnnotatorPortlet)

    def __init__(self, label=u"Inline comments"):
        self.label = label

    @property
    def title(self):
        """ Get portlet title
        """
        return self.label or u'Inline comments'


class AddForm(base_.AddForm):
    """ Add portlet
    """
    schema = IAnnotatorPortlet  # this is for Plone 5
    fields = field.Fields(IAnnotatorPortlet)  # this is for Plone 4
    label = _(u"Add Inline comments (Annotator) portlet")
    description = _(
        u"This portlet traces all inline comments for this document")

    def create(self, data):
        """ Create
        """
        return Assignment(label=data.get('label', _(u'Inline comments')))


class EditForm(base_.EditForm):
    """ Portlet edit
    """
    schema = IAnnotatorPortlet
    fields = field.Fields(IAnnotatorPortlet)
    label = _(u"Edit Inline comments (Annotator) portlet")
    description = _(
        u"This portlet traces all inline comments for this document")


class Renderer(base.Renderer):
    """ portlet renderer
    """
    render = ViewPageTemplateFile('annotator.pt')

    @property
    def user(self):
        """ Current user
        """
        if not getattr(self, '_user', None):
            mtool = getToolByName(self.context, 'portal_membership')
            member = mtool.getAuthenticatedMember()
            self._user = member.getId()
        return self._user

    @property
    def moderate(self):
        """ Can moderate inline comments
        """
        if not checkPermission('eea.annotator.manage', self.context):
            return False
        return True

    @property
    def can_subscribe(self):
        """ Is current user subscribed
        """
        if not checkPermission('eea.annotator.view', self.context):
            return False

        storage = queryAdapter(self.context, IAnnotatorStorage)
        if not storage:
            return False

        subscribed = storage.subscribers.get(self.user, False)
        if not subscribed:
            return True
        return False

    @property
    def can_unsubscribe(self):
        """ Is current user subscribed
        """
        if not checkPermission('eea.annotator.view', self.context):
            return False

        storage = queryAdapter(self.context, IAnnotatorStorage)
        if not storage:
            return False

        if self.can_subscribe:
            return False
        return True

    @property
    def disabled(self):
        """ Check if inline comments are disabled for current context
        """
        context_type = getattr(self.context, 'portal_type', None)
        settings = queryUtility(IRegistry).forInterface(ISettings, None)
        enabled_types = settings.portalTypes if settings else None
        if isinstance(enabled_types, list) and context_type in enabled_types:
            return False
        return True

    @property
    def available(self):
        """By default, portlets are available on view view and edit view
        """

        if not checkPermission('eea.annotator.view', self.context):
            return False

        plone = getMultiAdapter((self.context, self.request),
                                name=u'plone_context_state')
        is_edit_view = 'edit' in self.request.URL0.split('/')[-1]
        if not (plone.is_view_template() or is_edit_view):
            return False

        storage = queryAdapter(self.context, IAnnotatorStorage)
        if storage and storage.disabled:
            return False

        if self.disabled:
            return False

        return True
