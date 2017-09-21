""" Custom viewlets
"""
from zope.component import getMultiAdapter
from zope.component import queryAdapter
from zope.security import checkPermission
from plone.app.layout.viewlets import common
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from Products.CMFCore.utils import getToolByName
from eea.annotator.interfaces import IAnnotatorStorage
from eea.annotator.controlpanel.interfaces import ISettings


class Annotator(common.ViewletBase):
    """ Custom viewlet
    """
    render = ViewPageTemplateFile('../zpt/viewlet.pt')

    def __init__(self, context, request, view, manager=None):
        super(Annotator, self).__init__(context, request, view, manager)
        self._settings = None

    @property
    def settings(self):
        """ Settings
        """
        if self._settings is None:
            self._settings = ISettings(self.context)
        return self._settings

    @property
    def userid(self):
        """ Current user id
        """
        mtool = getToolByName(self.context, 'portal_membership')
        return mtool.getAuthenticatedMember().getId()

    @property
    def username(self):
        """ Current user name
        """
        mtool = getToolByName(self.context, 'portal_membership')
        return mtool.getAuthenticatedMember().getProperty(
            'fullname', self.userid)

    @property
    def readOnly(self):
        """ Read-only inline comments?
        """
        if not checkPermission('eea.annotator.edit', self.context):
            return True
        storage = queryAdapter(self.context, IAnnotatorStorage)
        return storage.readOnly if storage else False

    @property
    def autoSync(self):
        """ Auto-sync inline comments interval
        """
        return self.settings.autoSync

    @property
    def minWords(self):
        """ Minimum words to be selectable
        """
        return self.settings.minWords or 0

    @property
    def exactMatch(self):
        """ Exact match
        """
        return self.settings.exactMatch or False

    @property
    def noDuplicates(self):
        """ Don't allow duplicates
        """
        return self.settings.noDuplicates or False

    @property
    def available(self):
        """ Available
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

        settings = ISettings(self.context)
        if settings.disabled:
            return False

        return True
