/* Единые данные для каталога, калькулятора и формы. */
'use strict';
const HV_DATA = {
  "groom": {
    "price": 2400,
    "minutes": 90,
    "pets": [
      "dog"
    ],
    "image": "dog",
    "ru": {
      "title": "Стрижка и уход",
      "description": "Купание, сушка и аккуратная стрижка с учётом типа шерсти.",
      "steps": "Знакомство → купание → сушка → стрижка"
    },
    "en": {
      "title": "Grooming & haircut",
      "description": "A bath, drying and a haircut suited to your dog’s coat.",
      "steps": "Introduction → bath → drying → haircut"
    }
  },
  "bath": {
    "price": 1600,
    "minutes": 60,
    "pets": [
      "dog",
      "cat"
    ],
    "image": "cat",
    "ru": {
      "title": "Купание и вычёс",
      "description": "Мягкое очищение, сушка и вычёсывание выпавшей шерсти.",
      "steps": "Знакомство → купание → сушка → вычёс"
    },
    "en": {
      "title": "Bath & brush",
      "description": "Gentle cleansing, drying and brushing out loose hair.",
      "steps": "Introduction → bath → drying → brushing"
    }
  },
  "ears": {
    "price": 700,
    "minutes": 30,
    "pets": [
      "dog",
      "cat"
    ],
    "image": "dog",
    "ru": {
      "title": "Гигиенический уход",
      "description": "Базовый уход за ушами и когтями в одном коротком визите.",
      "steps": "Знакомство → осмотр → уход за ушами → когти"
    },
    "en": {
      "title": "Hygiene care",
      "description": "Basic ear and nail care in one short visit.",
      "steps": "Introduction → check → ear care → nail trim"
    }
  },
  "nails": {
    "price": 400,
    "minutes": 15,
    "pets": [
      "dog",
      "cat"
    ],
    "image": "cat",
    "ru": {
      "title": "Уход за когтями",
      "description": "Отдельная короткая процедура для ухоженных лап.",
      "steps": "Знакомство → осмотр лап → укорочение когтей"
    },
    "en": {
      "title": "Nail trim",
      "description": "A separate short appointment for tidy paws.",
      "steps": "Introduction → paw check → nail trim"
    }
  },
  "deshed": {
    "price": 2100,
    "minutes": 75,
    "pets": [
      "dog",
      "cat"
    ],
    "image": "cat",
    "ru": {
      "title": "Экспресс-линька",
      "description": "Купание и тщательный вычёс подшёрстка без изменения формы.",
      "steps": "Знакомство → купание → вычёс подшёрстка → сушка"
    },
    "en": {
      "title": "De-shedding",
      "description": "A bath and thorough undercoat brushing without a haircut.",
      "steps": "Introduction → bath → undercoat brushing → drying"
    }
  },
  "puppy": {
    "price": 1000,
    "minutes": 30,
    "pets": [
      "dog"
    ],
    "image": "dog",
    "ru": {
      "title": "Первое знакомство",
      "description": "Спокойное знакомство собаки с местом, инструментами и мастером.",
      "steps": "Знакомство → осмотр → пробный уход → рекомендации"
    },
    "en": {
      "title": "First visit",
      "description": "A calm introduction to the salon, tools and groomer.",
      "steps": "Introduction → check → short care session → care notes"
    }
  }
};
window.HV_SERVICES = Object.fromEntries(Object.entries(HV_DATA).map(([key, item]) => [key, {...item, ...item[document.documentElement.lang === 'en' ? 'en' : 'ru']} ]));
