if (Meteor.isClient) {
  var sort_fields = ["status_sort", "name_sort", "city_sort", "mapped_sort"];
  var sort_fields_to_label = {"status_sort": "status", "name_sort": "last_name", "city_sort": "city", "mapped_sort": "lat"};

  Meteor.startup(function() {
    Session.set("primary_sort_field_subscribers", "status_sort");
    Session.set("status_sort", -1);
    Session.set("name_sort", 1);
    Session.set("city_sort", 1);
    Session.set("mapped_sort", 1);

    Session.set("selected_subscriber", null);
    Session.set("subscriber_search_input", '');

    var current_search_fields = {
      'status': '=connected'
    };
    Session.set("subscriber_search_fields", current_search_fields);
    Session.set('loading', true);
    Tracker.autorun(getSubscribers);
  });

  function getSubscribers(computation) {
    var subquery = [];
    if (Session.get("subscriber_search_fields") != null) {
      var current_search_fields = Session.get("subscriber_search_fields");
      if (Session.get("subscriber_search_input").length > 0) {
        var search_field = $("#search_tag").val().trim();
        current_search_fields[search_field] = Session.get("subscriber_search_input");
      }

      for (s in current_search_fields) {
        var field_query = {};
        field_query[s] = { '$regex': current_search_fields[s], '$options': 'i' };
        subquery.push(field_query);
      }

    }
    query = {};
    if (subquery.length > 0) {
      query = {$and: subquery};
    }

    // var include_fields = {'first_name': 1, 'last_name': 1, 'status': 1, 'street_address': 1, 'city': 1, 'lat': 1, 'lng': 1, 'prior_email': 1, 'archived': 1, 'plan': 1, 'activation_date': 1, 'billing_info': 1};
    //
    var seeNeedsPayment = Session.get('seeNeedsPayment');
    var seePastDue = Session.get('seePastDue');
    var seeAutopay = Session.get('seeAutopay');
    var headerSort = GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_subscribers");
    Session.set('loading', true);
    Meteor.call('getEmailsList', query, headerSort, function (err, result) {
      if (err) {
        console.log("getEmailsList call failed: " + err);
      } else {
        if (!result) {
          console.log("getEmailsList call failed");

        } else {
          if (seeNeedsPayment) {
            result = _.filter(result, function(sub) {
            return sub.billing_info.needsPayment;
            });
          }

          if (seePastDue) {
            result = _.filter(result, function(sub) {
              return sub.billing_info.pastDue;
            });
          }
          if (seeAutopay) {
            result = _.filter(result, function(sub) {
              return typeof sub.billing_info.autopay === 'object' && sub.billing_info.autopay.on;
            });
          }
          Session.set("subscriber_count", result.length);
          Session.set('subscribersList', result);
          Session.set('loading', false);
        }
      }
    });
  };

  Template.subscribersEmailsList.helpers({
    errorMsg: function() {
      return Session.get('errorMsg');
    },
    hideTable: function() {
      return (Session.get('loading')) ? 'hidden' : '';
    },
    loading: function() {
      return (Session.get('loading')) ? '' : 'hidden';
    },
    disabledPropertyIfNone: function(value) {
      return value ? '' : 'disabled';
    },
    searchable_fields: function () {
      console.log('searchable fields');
      return [ "last_name", "first_name", "city", "status", "street_address", "plan", "subscriber_type", "mobile", "landline", "prior_email", "archived", "current_provider", "bts_to_use"];
    },
    seeNeedsPayment:  function() {
      return Session.get('seeNeedsPayment');
    },
    seeNeedsPaymentChecked: function() {
      var seeNeedsPayment = Session.get('seeNeedsPayment');
      return seeNeedsPayment ? 'selected' : '';
    },
    seePastDue: function() {
      return Session.get('seePastDue');
    },
    seePastDueChecked: function() {
      var seePastDue = Session.get('seePastDue');
      return seePastDue ? 'selected' : '';
    },
    seeAutopay:  function() {
      return Session.get('seeAutopay');
    },
    seeAutopayChecked: function() {
      var seeAutopay = Session.get('seeAutopay');
      return seeAutopay ? 'selected' : '';
    },
    current_search_fields: function () {
      console.log('current search fields.');
      var current_search_fields = Session.get("subscriber_search_fields");
      return current_search_fields;
    },
    subscribers: function () {
      return Session.get('subscribersList');
    },
    subscriber_count: function () {
      return Session.get("subscriber_count");
    },
    emailChoices: function() {
      var emails = EJSON.clone(FREmails);

      emails.customEmail = {
        label: 'Custom Email',
        body: '',
        from: FRSettings.email.defaultSender
      };

      return emails;
    },
    emailContents: function() {
      return Session.get('emailContents') || '';
    },
  });

  var subscriber_search_input_timeout = false;
  var subscriber_search_input_lag_ms = 1000;

  var setEmailContents = function() {
    var sub = Session.get('subscribersList')[0];
    var emailKey = $('#email-choice').val();
    var accountId = '0000000';
    var userLink = 'https://customerportal.furtherreach.net';
    var emailObj = FREmails[emailKey];
    var email;
    if (emailKey === 'customEmail') {
      email = {
        body: '',
        subject: '',
        custom: true,
        from: FRSettings.email.defaultSender
      }
    } else {
      email = {
        body: emailObj.body(sub, userLink, accountId),
        subject: emailObj.subject(sub),
      }
    }

    Session.set('emailContents', email);
    $('#subscriber_email').modal('show');
  };

  var getUserBillingLink = function (subscriber_id, callback) {
    console.log("about to call generateAuthToken with " + subscriber_id);
    Meteor.call('generateAuthToken', subscriber_id, function (err, result) {
      if (err) {
        console.log("generateAuthToken call failed: " + err);
      } else {
        console.log("Called generateAuthToken, got: " + result);
        if (!result) {
          console.log("generateAuthToken failed.");
        } else {
          var user_link = Meteor.settings.public.urls.customerPortal + result;
          console.log("setting user billing link " + user_link);
          Session.set("user_billing_link", user_link);
          if (typeof callback === 'function') {
            callback(user_link);
          }
        }
      }
    });
    return Session.get('user_billing_link');
  };

  Template.subscribersEmailsList.events({
    'keyup .subscriber_search_input': function (evt) {
      if (Session.get("subscriber_search_input_timeout") != true) {
        subscriber_search_input_timeout = true;

        setTimeout(function() {
          Session.set("subscriber_search_input", $("#subscriber_search_input").val().trim());
          subscriber_search_input_timeout = false;
        }, subscriber_search_input_lag_ms);
      }
    },
    'click .customer-portal-button': function (evt) {
      console.log(this);
      console.log(evt);
      evt.preventDefault();
      var elem = evt.target;
      getUserBillingLink(this._id._str, function(userBillingLink) {
        $(elem).prop('href', userBillingLink);
        var win = window.open(userBillingLink, '_blank');
      });
    },
    'click #select-all-emails': function (evt) {
      if ($(evt.target).prop('checked')) {
        $('.email-sub').prop('checked', true);
      } else {
        $('.email-sub').prop('checked', false);
      }
    },
    'change #see-past-due': function (evt) {
      if ($(evt.target).prop('checked')) {
        Session.set('seePastDue', true);
      } else {
        Session.set('seePastDue', false);
      }
    },
    'change #see-autopay': function (evt) {
      if ($(evt.target).prop('checked')) {
        Session.set('seeAutopay', true);
      } else {
        Session.set('seeAutopay', false);
      }
    },
    'change #see-needs-payment': function (evt) {
      if ($(evt.target).prop('checked')) {
        Session.set('seeNeedsPayment', true);
      } else {
        Session.set('seeNeedsPayment', false);
      }
    },
    'click #add_search_field': function (evt) {
      var search_value = $("#subscriber_search_input").val().trim();
      console.log("search_value: " + search_value);
      var search_field = $("#search_tag").val().trim();
      console.log("search_field: " + search_field);

      var current_search_fields = Session.get("subscriber_search_fields");
      current_search_fields[search_field] = search_value;
      Session.set("subscriber_search_fields", current_search_fields);

      // Clear the subscriber input box since we've grabbed it.
      $("#subscriber_search_input").val("");
      Session.set("subscriber_search_input", "");
    },
    'click .delete_search_field': function (evt) {
      var current_search_fields = Session.get("subscriber_search_fields");
      delete current_search_fields[this.key];
      Session.set("subscriber_search_fields", current_search_fields);
    },
    'click #show_archived_subscribers': function (evt) {
      archived_subscribers_dep.changed();
    },
    'click #show_non_archived_subscribers': function (evt) {
      non_archived_subscribers_dep.changed();
    },
    'click #open_send_email': function() {
      setEmailContents();
     },
    'change #email-choice': function(evt) {
      var emailKey = $('#email-choice').val();
      setEmailContents();
    },
    'click #send_emails': function() {
      var emailKey = $('#email-choice').val();
      var subs = [];
      $('.email-sub').each(function(index, elem) {
        if ($(elem).prop('checked')) {
          subs.push($(elem).data('subscriber'));
        }
      });

      var subsEmail = true;
      var missingEmailSubs = [];
      _.each(subs, function(subId) {
        var hasEmail = false;
        var sub = Subscribers.findOne(new Meteor.Collection.ObjectID(subId));

        if (typeof sub.contacts === 'object') {
          _.each(sub.contacts, function(c) {
            if (c.type === "billing") {
              var contact = Contacts.findOne(c.contact_id);
              if(typeof contact.email === 'string') {
                sub.billing_email = contact.email;
                if (contact.email.trim !== '' && FRMethods.isValidEmail(contact.email)) {
                  hasEmail = true;
                }
              }
            }
          });
        }

        if (typeof sub.prior_email === 'string' && 
            sub.prior_email.trim() !== '' &&
            FRMethods.isValidEmail(sub.prior_email)) {
          hasEmail = true;
        }

        if (!hasEmail) {
          subsEmail = false;
          missingEmailSubs.push(sub);
        }
      });

      var customEmail; 
      if (emailKey === 'customEmail') {
        customEmail = {
          body: $('textarea.email-contents').val(),
          subject: $('input#custom-email-subject').val(),
          from: $('input#custom-email-from').val(),
        };
      }

      var sendEmails = function(subs) {
        Meteor.call('sendEmails', subs, emailKey, customEmail, function(err, result) {
          if (!err) {
            console.log(result);
          } else {
            console.log(err);
          }
        });
      }

      if (!subsEmail) {
        var errorMessage = 'The Following Subscribers either have invalid prior_email or invalid billing contact email: <br/><br/>';
        _.each(missingEmailSubs, function(sub) {
          errorMessage += sub.first_name + ' ' + sub.last_name + 
                          ' prior_email: ' + sub.prior_email + 
                          ' billing email: ' + sub.billing_email + '<br/>';
        });
        errorMessage += '<br/>Are you sure you want to send emails?';
        bootbox.confirm(errorMessage, function(result) {
          if (result) {
            sendEmails(subs);
          }
        });
      } else {
        sendEmails(subs);
      }
    },
    'click .name_header': function () {
      Session.set("name_sort", -1 * Session.get("name_sort"));
      Session.set("primary_sort_field_subscribers", "name_sort");
    },
    'click .status_header': function () {
      Session.set("status_sort", -1 * Session.get("status_sort"));
      Session.set("primary_sort_field_subscribers", "status_sort");
    },
    'click .city_header': function () {
      Session.set("city_sort", -1 * Session.get("city_sort"));
      Session.set("primary_sort_field_subscribers", "city_sort");
    },
    'click .mapped_header': function () {
      Session.set("mapped_sort", -1 * Session.get("mapped_sort"));
      Session.set("primary_sort_field_subscribers", "mapped_sort");
    }
  });

  close_subscriber_modal = function() {
    $('#subscriber_details_modal').modal('hide');
  };
}
