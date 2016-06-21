""" RDF Marshaller ping action
"""
from zope.component import adapts, queryAdapter
from zope.formlib import form
from zope.interface import implements, Interface

from OFS.SimpleItem import SimpleItem
from plone.contentrules.rule.interfaces import IExecutable, IRuleElementData
from plone.app.contentrules.browser.formhelper import AddForm as PloneAddForm
from plone.app.contentrules.browser.formhelper import EditForm as PloneEditForm
from eea.annotator.rules.interfaces import IAnnotatorAction
from eea.annotator.interfaces import IAnnotatorStorage


class AnnotatorAction(SimpleItem):
    """ Action settings
    """
    implements(IAnnotatorAction, IRuleElementData)

    disableAnnotator = False
    readOnlyAnnotator = False
    element = 'eea.annotator.rules.actions.Annotator'
    summary = u'Inline comments'


class AnnotatorActionExecutor(object):
    """ Ping Action executor
    """
    implements(IExecutable)
    adapts(Interface, IAnnotatorAction, Interface)

    def __init__(self, context, element, event):
        self.context = context
        self.element = element
        self.event = event

    def __call__(self):
        disableAnnotator = self.element.disableAnnotator
        readOnlyAnnotator = self.element.readOnlyAnnotator

        context = self.event.object
        annotator = queryAdapter(context, IAnnotatorStorage)
        if not annotator:
            return True

        annotator.disabled = disableAnnotator
        annotator.readOnly = readOnlyAnnotator

        return True


class AddForm(PloneAddForm):
    """ Action add form
    """
    schema = IAnnotatorAction
    label = u"Add Inline Comments action"
    description = u"A annotator action."
    form_name = u"Enable/disable inline comments"

    def create(self, data):
        """ Ping Action Create method
        """
        action = AnnotatorAction()
        form.applyChanges(action, self.form_fields, data)
        return action


class EditForm(PloneEditForm):
    """ Action edit form
    """
    schema = IAnnotatorAction
    label = u"Edit Inline Comments action"
    description = u"A annotator action."
    form_name = u"Enable/disable inline comments"
