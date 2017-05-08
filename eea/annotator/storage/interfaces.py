""" Storage interfaces

    >>> portal = layer['portal']
    >>> sandbox = portal['sandbox']

"""
from zope import schema
from zope.interface import Interface
from eea.annotator.config import EEAMessageFactory as _

class IAnnotatorStorage(Interface):
    """ Access/Update annotator configuration

        >>> from eea.annotator.interfaces import IAnnotatorStorage
        >>> storage = IAnnotatorStorage(sandbox)
        >>> storage
        <eea.annotator.storage.handler.Storage object...>

        >>> comment = storage.add({'text': 'A comment'})
        >>> comment
        {...'text': 'A comment'...}

        >>> storage.edit({'text': 'Another comment'})
        Traceback (most recent call last):
        ...
        KeyError: None

        >>> storage.edit({'id': 'random-id'})
        Traceback (most recent call last):
        ...
        KeyError: 'random-id'

        >>> oid = comment.get('id')
        >>> storage.edit({'id': oid, 'text': 'Updated comment'})
        {...'text': 'Updated comment'...'created'...}

    """
    disabled = schema.Bool(title=_(u"Is annotator disabled?"))
    readOnly = schema.Bool(title=_(u"Is annotator read-only?"))
