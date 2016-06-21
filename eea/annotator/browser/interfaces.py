""" Browser interfaces

   >>> portal = layer['portal']
   >>> sandbox = portal['sandbox']

"""
from zope.interface import Interface
from zope.publisher.interfaces.browser import IDefaultBrowserLayer


class ILayer(IDefaultBrowserLayer):
    """ Custom layer for this package
    """


class IAnnotatorAPI(Interface):
    """ Annotator API
    """


class IAnnotatorAnnotations(Interface):
    """ Annotator Annotations
    """
