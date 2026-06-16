import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Text,
  Preview,
} from "@react-email/components";

export interface PortalNotificationEmailProps {
  recipientName: string;
  recipientRole: "student" | "teacher" | "department_head";
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

const bodyStyle = {
  backgroundColor: "#f7f4ee",
  color: "#18181b",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#fffdf8",
  border: "1px solid #eadfcf",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "620px",
  overflow: "hidden",
  padding: "32px",
};

const accentStyle = {
  color: "#b42318",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  margin: 0,
  textTransform: "uppercase" as const,
};

const cardStyle = {
  backgroundColor: "#faf4e7",
  border: "1px solid #e8dcc7",
  borderRadius: "14px",
  padding: "16px 18px",
};

function getGreeting(role: PortalNotificationEmailProps["recipientRole"]) {
  switch (role) {
    case "student":
      return "Уважаемый студент";
    case "department_head":
      return "Уважаемый зав. отделения";
    case "teacher":
    default:
      return "Уважаемый преподаватель";
  }
}

export default function PortalNotificationEmail({
  recipientName,
  recipientRole,
  title,
  message,
  actionHref,
  actionLabel,
}: PortalNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`BarJoq: ${title}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={accentStyle}>PolyTech | BarJoq</Text>

          <Heading
            style={{
              fontSize: "28px",
              lineHeight: "1.2",
              margin: "18px 0 10px",
            }}
          >
            {title}
          </Heading>

          <Text
            style={{
              color: "#52525b",
              fontSize: "16px",
              lineHeight: "1.7",
              margin: "0 0 20px",
            }}
          >
            {getGreeting(recipientRole)} {recipientName}, для вас есть новое
            уведомление в системе BarJoq.
          </Text>

          <Section style={cardStyle}>
            <Text
              style={{
                color: "#18181b",
                fontSize: "18px",
                fontWeight: "700",
                margin: "0 0 10px",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: "#3f3f46",
                fontSize: "15px",
                lineHeight: "1.7",
                margin: 0,
              }}
            >
              {message}
            </Text>
          </Section>

          {actionHref ? (
            <Section style={{ marginTop: "22px" }}>
              <Button
                href={actionHref}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "12px",
                  color: "#ffffff",
                  display: "inline-block",
                  fontSize: "15px",
                  fontWeight: "700",
                  padding: "12px 18px",
                  textDecoration: "none",
                }}
              >
                {actionLabel ?? "Открыть кабинет"}
              </Button>
            </Section>
          ) : null}

          <Hr style={{ borderColor: "#eadfcf", margin: "24px 0" }} />

          <Text
            style={{
              color: "#71717a",
              fontSize: "13px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Это автоматическое письмо от платформы BarJoq. Основная информация
            также доступна в вашем личном кабинете.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
