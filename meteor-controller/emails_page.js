if (Meteor.isClient) {
  var sort_fields = ["status_sort", "name_sort", "city_sort", "mapped_sort"];
  var sort_fields_to_label = {"status_sort": "status", "name_sort": "last_name", "city_sort": "city", "mapped_sort": "lat"};

  Meteor.startup(function() {
    console.log('on startup?');
    Session.set("primary_sort_field_subscribers", "status_sort");
    Session.set("status_sort", -1);
    Session.set("name_sort", 1);
    Session.set("city_sort", 1);
    Session.set("mapped_sort", 1);

    Session.set("selected_subscriber", null);
    Session.set("subscriber_search_input", "");
    Session.set("subscriber_search_fields", {});
  });

  Template.subscribers_emails_list.searchable_fields = function () {
    console.log('searchable fields');
    return [ "last_name", "first_name", "city", "status", "street_address", "plan", "subscriber_type", "mobile", "landline", "prior_email", "archived", "current_provider", "bts_to_use" ];
  };

  Template.subscribers_emails_list.current_search_fields = function () {
    console.log('current search fields.');
    var current_search_fields = Session.get("subscriber_search_fields");
    return current_search_fields;
  };

  Template.subscribers_emails_list.subscribers = function () {
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

    var include_fields = {'first_name': 1, 'last_name': 1, 'status': 1, 'street_address': 1, 'city': 1, 'lat': 1, 'lng': 1, 'prior_email': 1, 'archived': 1, 'plan': 1, 'billing_info': 1};

    var result = Subscribers.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_subscribers")});
    Session.set("subscriber_count", result.count());

    return result;
  };

  Template.subscribers_emails_list.subscriber_count = function () {
    return Session.get("subscriber_count");
  };

  var subscriber_search_input_timeout = false;
  var subscriber_search_input_lag_ms = 1000;

  Template.subscribers_emails_list.events({
    'keyup .subscriber_search_input': function (evt) {
      if (Session.get("subscriber_search_input_timeout") != true) {
        subscriber_search_input_timeout = true;

        setTimeout(function() {
          Session.set("subscriber_search_input", $("#subscriber_search_input").val().trim());
          subscriber_search_input_timeout = false;
        }, subscriber_search_input_lag_ms);
      }
    },
    'click #select-all-emails': function (evt) {
      $('.email-sub').each(function(index, elem) {
        if ($(elem).prop('checked')) {
          $(elem).attr('checked', false);
        } else {
          $(elem).attr('checked', true);
        }
      });
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
    }
  });

  Template.subscribers_emails_list.emailChoices = function() {
    return FREmails;
  };

  Template.subscribers_emails_list.events({
    'click #open_send_email': function() {
      $('#subscriber_email').modal('show');

    },
    'click #send_emails': function() {
      var emailKey = $('#email-choice').val();
      var subs = [];
      $('.email-sub').each(function(index, elem) {
        if ($(elem).prop('checked')) {
          subs.push($(elem).data('subscriber'));
        }
      });

      Meteor.call('sendEmails', subs, emailKey, function(err, result) {
        if (!err) {
          console.log(result);
        } else {
          console.log(err);
        }
      });
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