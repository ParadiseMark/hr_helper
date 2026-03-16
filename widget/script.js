define(['jquery'], function ($) {
  var CustomWidget = function () {
    var self = this

    this.callbacks = {
      render: function () {
        return true
      },

      init: function () {
        return true
      },

      bind_actions: function () {
        return true
      },

      settings: function () {
        return true
      },

      advancedSettings: function () {
        return true
      },

      onSave: function () {
        return true
      },

      destroy: function () {},

      contacts: {
        selected: function () {},
      },

      leads: {
        selected: function () {},
      },

      tasks: {
        selected: function () {},
      },
    }

    return this
  }

  return CustomWidget
})
