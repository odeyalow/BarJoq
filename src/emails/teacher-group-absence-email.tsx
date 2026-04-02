import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface TeacherGroupAbsenceEmailProps {
  teacherName: string;
  departmentHeadName: string;
  groupName: string;
  absenceCount: number;
  studentNames: string[];
}

const bodyStyle = {
  backgroundColor: "#f3f0ff",
  color: "#18181b",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #ddd6fe",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "620px",
  overflow: "hidden",
  padding: "32px",
};

const pillStyle = {
  backgroundColor: "#ede9fe",
  border: "1px solid #c4b5fd",
  borderRadius: "999px",
  color: "#5b21b6",
  display: "inline-block",
  fontSize: "13px",
  fontWeight: "700",
  margin: "0 10px 10px 0",
  padding: "8px 12px",
};

export default function TeacherGroupAbsenceEmail({
  teacherName,
  departmentHeadName,
  groupName,
  absenceCount,
  studentNames,
}: TeacherGroupAbsenceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>BarJoq: в вашей группе появились новые пропуски</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text
            style={{
              color: "#6d28d9",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            PolyTech | BarJoq
          </Text>

          <Heading
            style={{
              fontSize: "28px",
              lineHeight: "1.2",
              margin: "18px 0 10px",
            }}
          >
            У студентов группы {groupName} появились пропуски
          </Heading>

          <Text
            style={{
              color: "#52525b",
              fontSize: "16px",
              lineHeight: "1.7",
              margin: "0 0 20px",
            }}
          >
            Уважаемый преподаватель {teacherName}, у студентов ваших групп
            появились пропуски. Пожалуйста проверьте свой личный кабинет.
          </Text>

          <Text
            style={{
              color: "#71717a",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 20px",
            }}
          >
            Группа: {groupName}. Отчет загружен зав. отделения{" "}
            {departmentHeadName}. Всего новых пропусков: {absenceCount}.
          </Text>

          <Section>
            {studentNames.map((studentName) => (
              <Text key={studentName} style={pillStyle}>
                {studentName}
              </Text>
            ))}
          </Section>

          <Hr style={{ borderColor: "#ddd6fe", margin: "24px 0" }} />
          <Text
            style={{
              color: "#71717a",
              fontSize: "13px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Это отдельное письмо для преподавателя. В нем отображаются только
            студенты вашей группы, у которых после импорта появились пропуски.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
