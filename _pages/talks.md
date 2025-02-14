---
layout: defaults/page
permalink: talks.html
narrow: true
title: Talks
---

{% assign reversed_pres = site.pres | reverse %}

{% for pres in reversed_pres %}

- **{{pres.title}}** ({{pres.custom_date}})
<br>
 [{{pres.custom_event}}]({{pres.custom_url}}){% if pres.custom_lab != false %}, _{{pres.custom_lab}}_{% endif %}{% if pres.custom_city != false %}, _{{pres.custom_city}}_{% endif %}{% if pres.custom_country!= false %}, _{{pres.custom_country}}_{% endif %} {% if pres.custom_slides != false %} ([slides]({{pres.custom_slides}})){% endif %}{% if pres.custom_video != false %}  ([video]({{pres.custom_video}})){% endif %}

{% endfor %}

