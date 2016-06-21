""" Main product initializer
"""
from Products.CMFPlone import interfaces as Plone
from zope.interface import implementer


@implementer(Plone.INonInstallable)
class HiddenProfiles(object):

    def getNonInstallableProfiles(self):
        """Do not show on Plone's list of installable profiles."""
        return [
            u'eea.annotator:install-base',
            u'eea.annotator:uninstall-base',
        ]


def initialize(context):
    """Initializer called when used as a Zope 2 product.
    """
