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

export interface StudentAbsenceImportEmailProps {
  studentName: string;
  groupName: string;
  departmentHeadName: string;
  absences: Array<{
    subject: string;
    dateLabel: string;
    lessonLabel: string;
    teacherName: string;
    classroom: string;
  }>;
}

const bodyStyle = {
  backgroundColor: "#f5f1ea",
  color: "#18181b",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#fffdf8",
  border: "1px solid #e8dcc7",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "620px",
  overflow: "hidden",
  padding: "32px",
};

const cardStyle = {
  backgroundColor: "#faf4e7",
  border: "1px solid #e8dcc7",
  borderRadius: "14px",
  marginBottom: "12px",
  padding: "16px 18px",
};

export default function StudentAbsenceImportEmail({
  studentName,
  groupName,
  departmentHeadName,
  absences,
}: StudentAbsenceImportEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>BarJoq: у вас появились новые пропуски</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text
            style={{
              color: "#b42318",
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
            У вас появились пропуски
          </Heading>

          <Text
            style={{
              color: "#52525b",
              fontSize: "16px",
              lineHeight: "1.7",
              margin: "0 0 20px",
            }}
          >
            Уважаемый студент {studentName}, у вас появились пропуски. Пожалуйста
            проверьте свой личный кабинет и обязательно отработайте все
            пропуски.
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
            {departmentHeadName}.
          </Text>

          <Section>
            {absences.map((absence, index) => (
              <Section
                key={`${absence.subject}-${absence.dateLabel}-${index}`}
                style={cardStyle}
              >
                <Text
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    margin: "0 0 8px",
                  }}
                >
                  {absence.subject}
                </Text>
                <Text style={{ color: "#3f3f46", margin: "0 0 4px" }}>
                  Дата: {absence.dateLabel}
                </Text>
                <Text style={{ color: "#3f3f46", margin: "0 0 4px" }}>
                  Пара: {absence.lessonLabel}
                </Text>
                <Text style={{ color: "#3f3f46", margin: "0 0 4px" }}>
                  Преподаватель: {absence.teacherName}
                </Text>
                <Text style={{ color: "#3f3f46", margin: 0 }}>
                  Аудитория: {absence.classroom}
                </Text>
              </Section>
            ))}
          </Section>

          <Hr style={{ borderColor: "#eadfcf", margin: "24px 0" }} />
          <Text
            style={{
              color: "#71717a",
              fontSize: "13px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Это отдельное письмо для студента. В нем отображаются только ваши
            пропуски, добавленные после импорта отчета в BarJoq.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
