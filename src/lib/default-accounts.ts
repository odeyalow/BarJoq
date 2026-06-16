export const defaultStudentAccount = {
  fullName: "Айсин Алдияр",
  email: "aldiyar.aisin@gmail.com",
  password: "aldiyar01",
  group: "П22-4ИК",
};

export const secondStudentAccount = {
  fullName: "Шелкунов Даниель",
  email: "daniel.shelkunov@gmail.com",
  password: "daniel01",
  group: "П22-4ИК",
};

export const defaultTeacherAccount = {
  fullName: "Гульдана Омарбекова",
  email: "guldana.omarbekova@gmail.com",
  password: "guldana01",
  position: "преподаватель",
  department: "Отделение ПО и РЭТ",
};

export const defaultDepartmentHeadAccount = {
  fullName: "Индира Акылбековна",
  email: "indira.akylbekovna@gmail.com",
  password: "indira01",
  position: "заведующая отделением",
  department: "Отделение ПО и РЭТ",
};

export const defaultGroup = {
  name: "П22-4ИК",
  course: 4,
  specialty: "Программное обеспечение",
};

export const seededGroups = [defaultGroup] as const;

export const defaultSubjects = ["ПМ4 Веб-Программирование"];

export interface SeededStudent {
  fullName: string;
  age: number;
  course: number;
  email: string;
  withAccount: boolean;
  password?: string;
  groupName: string;
}

export const seededStudents: SeededStudent[] = [
  // Студенты с личными аккаунтами
  {
    fullName: defaultStudentAccount.fullName,
    age: 20,
    course: 4,
    email: defaultStudentAccount.email,
    withAccount: true,
    password: defaultStudentAccount.password,
    groupName: defaultGroup.name,
  },
  {
    fullName: secondStudentAccount.fullName,
    age: 20,
    course: 4,
    email: secondStudentAccount.email,
    withAccount: true,
    password: secondStudentAccount.password,
    groupName: defaultGroup.name,
  },
  // Остальные студенты группы без аккаунтов (плейсхолдеры состава группы)
  ...[
    ["Влад Усов", "vlad.usov"],
    ["Даниель Файвушкин", "daniel.faivushkin"],
    ["Фирдавс Чунгаков", "firdavs.chungakov"],
    ["Артем Морозов", "artem.morozov"],
    ["Иса Мухамеджан", "isa.mukhamedzhan"],
    ["Тимур Хайруллин", "timur.khairullin"],
    ["Самир Савердин", "samir.saverdin"],
    ["Денис Баркалов", "denis.barkalov"],
    ["Богдан Ревякин", "bogdan.revyakin"],
    ["Искандер Сабиров", "iskander.sabirov"],
    ["Нариман Мусакул", "nariman.musakul"],
    ["Дмитрий Скрынский", "dmitry.skrynsky"],
  ].map(([fullName, slug]) => ({
    fullName,
    age: 20,
    course: 4,
    email: `${slug}@barjoq.local`,
    withAccount: false,
    groupName: defaultGroup.name,
  })),
];
