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
 \(available on [HAL](https://hal.science/tel-05289296v2)\)
 
### Preprints

{% assign reversed_preprints = site.preprints | reverse %}

{% for preprint in reversed_preprints %}

- **{{preprint.title}}**{% if preprint.custom_accepted != false %}, _Accepted for publication {{preprint.custom_accepted}}_{% endif %}
 <br> 
 with {{preprint.custom_coauthors}}
 <br>
 \(available on  [{{preprint.custom_journal}}]({{preprint.custom_url}})\)
 
{% endfor %}

### Publications


- **Compressed Post-Quantum Silent OT from Isogenies**
 <br> 
 with Pouria Fallahpour and Mahshid Riahinia
 <br>
 \(accepted for publication at [SCN 2026](https://scn.unisa.it/scn26/)\)

{% assign reversed_papers = site.papers | reverse %}

{% for paper in reversed_papers %}

- **{{paper.title}}**
 <br> 
 with {{paper.custom_coauthors}}
 <br>
 published in [{{paper.custom_journal}}]({{paper.custom_url}})
 <br>
 \(available on [Cryptology ePrint Archive]({{paper.custom_eprint}})\)
 
{% endfor %}

