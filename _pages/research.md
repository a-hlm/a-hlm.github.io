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
 \(available on [HAL](https://hal.science/tel-05289296v2), [slides](https://a-hlm.github.io/theme/pdf/thesis_beamer.pdf)\)

### Publications


- **Algorithms for solving the isogeny problem with oriented elliptic curves**
 <br> 
 with Maria Corte-Real Santos, Joseph Macula, Michael Meyer, Travis Morrison and Eli Orvis
 <br>
 accepted for publication in [Communications in Cryptology, Volume 3, Issue 3 2026](https://cic.iacr.org/)
 <br>
 \(available on [Cryptology ePrint Archive](https://eprint.iacr.org/2026/1219)\)

- **Compressed Post-Quantum Silent OT from Isogenies**
 <br> 
 with Pouria Fallahpour and Mahshid Riahinia
 <br>
 accepted for publication at [SCN 2026](https://scn.unisa.it/scn26/)
 <br>
 \(extended version available on [Cryptology ePrint Archive](https://eprint.iacr.org/2026/1444)\)

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


### Reviewing

I have reviewed papers for DCC, ASIACRYPT 2026, ANTSXVII.
