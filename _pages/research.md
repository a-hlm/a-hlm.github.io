---
layout: defaults/page
permalink: research.html
narrow: true
title: Research
---

[comment]:### Ongoing work

[comment]:- **Unconditional foundations for supersingular isogeny-based cryptography**
[comment]:<br>
[comment]:with Benjamin Wesolowski

### Publications



### Preprints


{% assign reversed_preprints = site.preprints | reverse %}

{% for preprint in reversed_preprints %}

- **{{preprint.title}}**{% if preprint.custom_accepted != false %}, _Accepted for publication {{preprint.custom_accepted}}_{% endif %}
 <br> 
 with {{preprint.custom_coauthors}}
 <br>
 [{{preprint.custom_journal}}]({{preprint.custom_url}})
 
{% endfor %}
