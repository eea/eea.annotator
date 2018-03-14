""" Browser controllers
"""
import json
import logging
import hashlib

from eea.annotator.controlpanel.interfaces import ISettings
from zope.event import notify
from zope.interface import implements, implementer
from zope.component import queryMultiAdapter, queryAdapter
from zope.publisher.interfaces import IPublishTraverse
from AccessControl import Unauthorized
from Products.Five.browser import BrowserView
from Products.CMFCore.utils import getToolByName
from eea.annotator.browser.interfaces import IAnnotatorAPI
from eea.annotator.browser.interfaces import IAnnotatorAnnotations
from eea.annotator.interfaces import IAnnotatorStorage
from eea.annotator.cache import ramcache, cacheJsonKey, InvalidateCacheEvent
logger = logging.getLogger('eea.annotator')


def jsonify(obj, response=None, status=None):
    """ Convert obj to JSON
    """
    if response:
        response.setHeader("Content-type", "application/json")
        if status:
            response.setStatus(status)
    return json.dumps(obj)


class API(BrowserView):
    """ EEA Annotator API
    """
    implements(IAnnotatorAPI)

    def __getattr__(self, name):
        """ Override get annotations attr
        """
        if (name.startswith('annotations') and
            self.request.method in ('PUT', 'DELETE')):
            return queryMultiAdapter((self, self.request), name=name)
        return super(API, self).__getattr__(name)

    def absolute_url(self, *args, **kwargs):
        """ Absolute url
        """
        return u'/'.join((
            self.context.absolute_url(*args, **kwargs), self.__name__
        ))

    def __call__(self, **kwargs):
        qi = getToolByName(self.context, 'portal_quickinstaller')
        version = qi.getProductVersion('eea.annotator')
        return jsonify({
            "name": "EEA Annotator Store API",
            "version": version
            }, self.request.response)


@implementer(IPublishTraverse)
class Annotations(BrowserView):
    """ Annotator Storage
    """
    implements(IAnnotatorAnnotations)

    def __init__(self, context, request):
        super(Annotations, self).__init__(context, request)
        self.parent = context.context

    def jsonify(self, item, status=None):
        """ Convert object to JSON
        """
        return jsonify(item, self.request.response, status)

    def __getattr__(self, name):
        item = self.storage.get(name)
        return item if item else super(Annotations, self).__getattr__(name)

    @property
    def storage(self):
        """ Get storage adapter
        """
        return queryAdapter(self.parent, IAnnotatorStorage)

    @ramcache(cacheJsonKey, dependencies=['eea.annotator'])
    def index(self, **kwargs):
        """ Index
        """
        comments = [dict(item) for item in self.storage.comments.values()]
        return self.jsonify(comments)

    def read(self, item=None, **kwargs):
        """ Read
        """
        if item is not None:
            res = dict(item)
        else:
            name = self.request.get('name')
            res = dict(self.storage.get(name))
        return self.jsonify(res)

    def create(self, **kwargs):
        """ Create
        """
        raise Unauthorized("You're not authorized to create inline comments")

    def update(self, **kwargs):
        """ Update
        """
        raise Unauthorized("You're not authorized to edit inline comments")

    def delete(self, **kwargs):
        """ Delete
        """
        raise Unauthorized("You're not authorized to delete inline comments")

    def publishTraverse(self, REQUEST, name):
        """ Override traverser
        """
        if self.request.method == 'PUT':
            return self.update
        elif self.request.method == 'DELETE':
            return self.delete
        self.request.form['name'] = name
        return self.read

    def __call__(self, **kwargs):
        method = self.request.method
        if method == 'GET':
            return self.index()
        elif method == 'POST':
            return self.create()
        elif method == 'PUT':
            return self.update()
        elif method == 'DELETE':
            return self.delete()
        return jsonify("Bad request", self.request.response, 400)


@implementer(IPublishTraverse)
class AnnotationsEdit(Annotations):
    """ Annotator Storage Editor
    """

    @property
    def cacheKey(self):
        """ Compute cache key
        """
        key = u"eea.annotator.browser.app.view.index:"
        key += cacheJsonKey(None, self)
        key = key.replace('_edit', '_view')
        return hashlib.md5(key).hexdigest()

    def create(self, **kwargs):
        """ Create
        """
        try:
            item = self.request._file.read()
            item = self.storage.add(item)
        except Exception, err:
            logger.exception(err)
            return self.jsonify(err, 400)
        else:
            notify(InvalidateCacheEvent(key=self.cacheKey, raw=True))
            return self.read(item)

    def update(self, **kwargs):
        """ Update
        """
        try:
            item = self.request._file.read()
            item = self.storage.edit(item)
        except Exception, err:
            logger.exception(err)
            return self.jsonify(err, 400)
        else:
            notify(InvalidateCacheEvent(key=self.cacheKey, raw=True))
            return self.read(item)

    def delete(self, **kwargs):
        """ Delete
        """
        try:
            item = self.request._file.read()
            item = self.storage.delete(item)
        except Exception, err:
            logger.exception(err)
            return self.jsonify(err, 400)
        else:
            notify(InvalidateCacheEvent(key=self.cacheKey, raw=True))
            return self.read(item) if item else self.jsonify(None, 204)


class AnnotationsSearch(BrowserView):
    """ Annotator Storage
    """
    def __call__(self, **kwargs):

        ## Not implemented yet
        #kwargs.update(self.request.form)
        #query = kwargs.get('text', '')
        #limit = kwargs.get('limit', None)
        #offset = kwargs.get('offset', None)

        return jsonify({
            'total': 0,
            'rows': []
            }, self.request.response)


class AnnotationSettings(BrowserView):
    """ EEA Annotator Settings
    """

    def __init__(self, context, request):
        super(AnnotationSettings, self).__init__(context, request)
        self.context = context
        self.request = request

    def is_enabled(self):
        """
        :return: Boolean if annotation is enabled or not for given context
        :rtype: Boolean
        """
        settings = ISettings(self.context)
        return False if settings.disabled else True
