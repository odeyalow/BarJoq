export const defaultStudentAccount = {
  fullName: "Тоғжан Уркен",
  email: "togzhan.urken@barjoq.local",
  password: "student123",
  group: "П25-1В",
};

export const defaultTeacherAccount = {
  fullName: "Кәрімов Айдар Нурланұлы",
  email: "aidar.karimov@barjoq.local",
  password: "teacher123",
  position: "старший преподаватель",
  department: "Кафедра информационных технологий",
};

export const defaultDepartmentHeadAccount = {
  fullName: "Серикбаева Алия Ерлановна",
  email: "aliya.serikbaeva@barjoq.local",
  password: "head123",
  position: "заведующая отделением",
  department: "Отделение информационных технологий",
};

export const defaultGroup = {
  name: defaultStudentAccount.group,
  course: 1,
  specialty: "Программное обеспечение",
};

export const seededGroups = [defaultGroup] as const;

export const defaultSubjects = ["Web-технологии", "Базы данных"];

export const seededStudents = [
  {
    fullName: defaultStudentAccount.fullName,
    age: 18,
    course: 1,
    email: defaultStudentAccount.email,
    withAccount: true,
    groupName: defaultGroup.name,
  },
  {
    fullName: "Мирас Сәкен",
    age: 18,
    course: 1,
    email: "miras.saken@barjoq.local",
    withAccount: false,
    groupName: defaultGroup.name,
  },
  {
    fullName: "Бекнар Тұрсыналы",
    age: 18,
    course: 1,
    email: "beknar.tursynaly@barjoq.local",
    withAccount: false,
    groupName: defaultGroup.name,
  },
  {
    fullName: "Аружан Сайлаубай",
    age: 18,
    course: 1,
    email: "aruzhan.sailaubai@barjoq.local",
    withAccount: false,
    groupName: defaultGroup.name,
  },
  {
    fullName: "Мирас Сабит",
    age: 18,
    course: 1,
    email: "miras.sabit@barjoq.local",
    withAccount: false,
    groupName: defaultGroup.name,
  },
] as const;
