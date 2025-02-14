---
layout: defaults/page
permalink: teaching.html
narrow: true
title: Teaching
---
### Teaching assistant

{% assign reversed_cours = site.cours| reverse %}

{% for cours in reversed_cours %}
- **{{ cours.title }}** ({{cours.custom_date}})
<br>
{{cours.custom_class}}, lecture by {{cours.custom_teacher}}, 
 [page]({{cours.custom_url}})
{% endfor %}


