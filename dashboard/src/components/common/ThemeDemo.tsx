import React from 'react';
import styled from 'styled-components';
import {
  Container,
  Grid,
  Flex,
  Card,
  Button,
  Input,
  Text,
  StatusBadge,
  media,
} from '../../styles/styled';
import { ThemeToggle } from './ThemeToggle';

const DemoSection = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const DemoTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.primary};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ColorPalette = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ColorSwatch = styled.div<{ color: string; textColor?: string }>`
  background-color: ${({ color }) => color};
  color: ${({ textColor, theme }) => textColor || theme.colors.text.inverse};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ButtonGroup = styled(Flex)`
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const StatusGrid = styled(Grid)`
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ResponsiveDemo = styled.div`
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.primary[500]},
    ${({ theme }) => theme.colors.secondary[500]}
  );
  color: ${({ theme }) => theme.colors.text.inverse};
  padding: ${({ theme }) => theme.spacing[6]};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  ${media.maxMd(`
    padding: ${({ theme }: any) => theme.spacing[4]};
    font-size: ${({ theme }: any) => theme.typography.fontSize.sm};
  `)}

  ${media.lg(`
    padding: ${({ theme }: any) => theme.spacing[8]};
    font-size: ${({ theme }: any) => theme.typography.fontSize.lg};
  `)}
`;

const AnimationDemo = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const AnimatedBox = styled.div<{ animation: string }>`
  width: 60px;
  height: 60px;
  background-color: ${({ theme }) => theme.colors.primary[500]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.inverse};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  animation: ${({ animation }) => animation};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[600]};
  }
`;

export const ThemeDemo: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Flex justify="between" align="center" style={{ marginBottom: '2rem' }}>
        <Text size="3xl" weight="bold">
          Theme System Demo
        </Text>
        <ThemeToggle showLabel />
      </Flex>

      <DemoSection>
        <DemoTitle>Color Palette</DemoTitle>
        <Text color="secondary" style={{ marginBottom: '1.5rem' }}>
          Primary colors used throughout the dashboard
        </Text>
        <ColorPalette>
          <ColorSwatch color="var(--color-primary)">Primary</ColorSwatch>
          <ColorSwatch color="var(--color-secondary)">Secondary</ColorSwatch>
          <ColorSwatch color="var(--color-success)">Success</ColorSwatch>
          <ColorSwatch color="var(--color-warning)">Warning</ColorSwatch>
          <ColorSwatch color="var(--color-error)">Error</ColorSwatch>
          <ColorSwatch
            color="var(--bg-secondary)"
            textColor="var(--text-primary)"
          >
            Background
          </ColorSwatch>
        </ColorPalette>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Typography</DemoTitle>
        <Text size="xs">Extra Small Text (12px)</Text>
        <Text size="sm">Small Text (14px)</Text>
        <Text size="base">Base Text (16px)</Text>
        <Text size="lg">Large Text (18px)</Text>
        <Text size="xl">Extra Large Text (20px)</Text>
        <Text size="2xl">2XL Text (24px)</Text>
        <Text size="3xl">3XL Text (30px)</Text>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Buttons</DemoTitle>
        <ButtonGroup>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="error">Error</Button>
          <Button variant="ghost">Ghost</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </ButtonGroup>
        <Button fullWidth style={{ marginTop: '1rem' }}>
          Full Width Button
        </Button>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Form Elements</DemoTitle>
        <Grid columns={2} gap="4">
          <FormGroup>
            <Label htmlFor="demo-input">Regular Input</Label>
            <Input id="demo-input" placeholder="Enter text here..." />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="demo-input-error">Error Input</Label>
            <Input
              id="demo-input-error"
              error
              placeholder="This has an error..."
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="demo-input-success">Success Input</Label>
            <Input
              id="demo-input-success"
              success
              placeholder="This is valid..."
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="demo-input-disabled">Disabled Input</Label>
            <Input
              id="demo-input-disabled"
              disabled
              placeholder="Disabled input..."
            />
          </FormGroup>
        </Grid>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Status Badges</DemoTitle>
        <StatusGrid gap="3">
          <StatusBadge status="online">Online</StatusBadge>
          <StatusBadge status="offline">Offline</StatusBadge>
          <StatusBadge status="warning">Warning</StatusBadge>
          <StatusBadge status="critical">Critical</StatusBadge>
        </StatusGrid>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Cards</DemoTitle>
        <Grid columns={3} responsive>
          <Card>
            <Text weight="semibold" style={{ marginBottom: '0.5rem' }}>
              Basic Card
            </Text>
            <Text color="secondary">
              This is a basic card with default styling.
            </Text>
          </Card>
          <Card hover>
            <Text weight="semibold" style={{ marginBottom: '0.5rem' }}>
              Hover Card
            </Text>
            <Text color="secondary">This card has hover effects enabled.</Text>
          </Card>
          <Card shadow="lg">
            <Text weight="semibold" style={{ marginBottom: '0.5rem' }}>
              Large Shadow
            </Text>
            <Text color="secondary">
              This card has a larger shadow for emphasis.
            </Text>
          </Card>
        </Grid>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Responsive Design</DemoTitle>
        <ResponsiveDemo>
          <Text size="lg" weight="bold" color="inverse">
            This component adapts to different screen sizes
          </Text>
          <Text color="inverse" style={{ marginTop: '0.5rem' }}>
            Resize your browser window to see the responsive behavior
          </Text>
        </ResponsiveDemo>
      </DemoSection>

      <DemoSection>
        <DemoTitle>Animations</DemoTitle>
        <Text color="secondary" style={{ marginBottom: '1rem' }}>
          Click on the boxes to see different animations (respects
          prefers-reduced-motion)
        </Text>
        <AnimationDemo>
          <AnimatedBox
            animation="spin 2s linear infinite"
            title="Spin animation"
          >
            ↻
          </AnimatedBox>
          <AnimatedBox
            animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            title="Pulse animation"
          >
            ♥
          </AnimatedBox>
          <AnimatedBox animation="bounce 1s infinite" title="Bounce animation">
            ↕
          </AnimatedBox>
          <AnimatedBox
            animation="fadeIn 2s ease-out infinite alternate"
            title="Fade animation"
          >
            ✨
          </AnimatedBox>
        </AnimationDemo>
      </DemoSection>
    </Container>
  );
};

export default ThemeDemo;
