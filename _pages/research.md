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


### PhD Thesis

- **On the foundations of supersingular isogeny-based cryptography**
 <br> 
 supervised by Benjamin Wesolowski and Guillaume Hanrot
 <br> 
 presented on 18 September 2025 at École Normale Supérieure de Lyon (ENS de Lyon), France 
 <br>
 \([manuscript](https://a-hlm.github.io/theme/pdf/manuscript_updated.pdf)\)
 
[comment]: <> (### Preprints)


{% assign reversed_preprints = site.preprints | reverse %}

{% for preprint in reversed_preprints %}

- **{{preprint.title}}**{% if preprint.custom_accepted != false %}, _Accepted for publication {{preprint.custom_accepted}}_{% endif %}
 <br> 
 with {{preprint.custom_coauthors}}
 <br>
 \(available on  [{{preprint.custom_journal}}]({{preprint.custom_url}})\)
 
{% endfor %}

### Publications

{% assign reversed_papers = site.papers | reverse %}

{% for paper in reversed_papers %}

- **{{paper.title}}**
 <br> 
 with {{paper.custom_coauthors}}
 <br>
 [{{paper.custom_journal}}]({{paper.custom_url}})
 <br>
 \(available on [Cryptology ePrint Archive]({{paper.custom_eprint}})\)
 
{% endfor %}

