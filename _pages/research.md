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


### Preprints


{% assign reversed_papers = site.papers | reverse %}

{% for paper in reversed_papers %}

- **{{paper.title}}**{% if paper.custom_accepted != false %}, _Accepted for publication {{paper.custom_accepted}}_{% endif %}
 <br> 
 with {{paper.custom_coauthors}}
 <br>
 [{{paper.custom_journal}}]({{paper.custom_url}})
 
{% endfor %}
