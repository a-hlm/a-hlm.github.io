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


{% assign reversed_pres = site.papers | reverse %}

{% for paper in reversed_pres %}

- **{{paper.title}}**
 <br> 
 with {{paper.custom_coauthors}}
 <br>
 [{{paper.custom_journal}}]({{paper.custom_url}})
 
{% endfor %}
