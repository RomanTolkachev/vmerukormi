export const MODULES = [
  { id: "cat-adult", name: "Кошка, взрослая", species: "CAT", formula: "100 * IW ^ 0.67", description: "Для расчёта используется идеальная масса." },
  { id: "cat-senior-cardio", name: "Кошка, сеньор кардио", species: "CAT", formula: "100 * IW ^ 0.67", description: "Энергетическая формула совпадает со взрослой кошкой." },
  { id: "cat-lactation", name: "Кошка, лактация", species: "CAT", formula: "100 * IW ^ 0.67 + IW * K * L", description: "K: <3=18; 3–4=60; ≥5=70. L зависит от недели." },
  { id: "cat-pregnancy", name: "Кошка, беременность", species: "CAT", formula: "140 * IW ^ 0.67", description: "Беременность." },
  { id: "cat-kitten", name: "Кошка, котёнок", species: "CAT", formula: "100 * AW ^ 0.67 * 6.7 * (exp(-0.189 * AW / IW) - 0.66)", description: "IW — ожидаемая взрослая масса." },
  { id: "dog-pregnancy-1", name: "Собака, беременность I", species: "DOG", formula: "132 * IW ^ 0.75", description: "Первая фаза беременности." },
  { id: "dog-pregnancy-2", name: "Собака, беременность II", species: "DOG", formula: "130 * IW ^ 0.75 + 26 * IW", description: "Вторая фаза беременности." },
  { id: "dog-adult", name: "Собака, взрослая", species: "DOG", formula: "100 * IW ^ 0.75", description: "Для расчёта используется идеальная масса." },
  { id: "dog-lactation", name: "Собака, лактация", species: "DOG", formula: "100 * IW ^ 0.75 + IW * (24 * N + 12 * M) * L", description: "N — первые 4 щенка, M — следующие 4; L зависит от недели." },
  { id: "dog-senior-cardio", name: "Собака, сеньор кардио", species: "DOG", formula: "90 * IW ^ 0.75", description: "Пониженный коэффициент." },
  { id: "dog-sport", name: "Собака, спорт и работа", species: "DOG", formula: "100 * IW ^ 0.75", description: "Нагрузку задавайте через поправку ОЭ." },
  { id: "dog-puppy-1", name: "Щенок 1 фаза роста", species: "DOG", formula: "100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)", description: "IW — ожидаемая взрослая масса." },
  { id: "dog-puppy-2", name: "Щенок 2 фаза роста", species: "DOG", formula: "100 * AW ^ 0.75 * 3.2 * (exp(-0.87 * AW / IW) - 0.1)", description: "По ОЭ совпадает с первой фазой; нутриентные нормы могут отличаться." },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
