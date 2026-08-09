# Invalid Contract Fixture

```json
{
  "cases": [
    {
      "id": "primary-template",
      "input": {"fdi": "54", "dentition": "permanent", "view": "facial"},
      "assertions": [
        {"path": "references/anatomy-svg-standard.md", "must_include": ["not a uniformly scaled permanent tooth", "cervical constriction", "root divergence", "furcation placement"]}
      ]
    }
  ]
}
```
