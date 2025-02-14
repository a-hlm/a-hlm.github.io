---
layout: defaults/page
permalink: research.html
narrow: true
title: Research
---

### Ongoing work

- **Unconditional foundations for supersingular isogeny-based cryptography**
<br>
with Benjamin Wesolowski


### Preprints

{% for paper in site.papers %}

- **{{paper.title}}**
 <br> 
 with {{paper.custom_coauthors}}
 <br>
 [{{paper.custom_journal}}]({{paper.custom_url}})
 
{% endfor %}
