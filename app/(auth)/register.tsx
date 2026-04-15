import { useState, type CSSProperties } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth } from '../../src/lib/AuthContext'
import { he } from '../../src/locales/he'
import { colors } from '../../src/lib/theme'

const webFormStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}

function RegisterFields(props: {
  displayName: string
  email: string
  password: string
  setDisplayName: (v: string) => void
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  error: string
  loading: boolean
  onSubmit: () => void
}) {
  const {
    displayName,
    email,
    password,
    setDisplayName,
    setEmail,
    setPassword,
    error,
    loading,
    onSubmit,
  } = props
  const [passwordVisible, setPasswordVisible] = useState(true)
  return (
    <>
      <Text style={styles.cardTitle}>{he.auth.register}</Text>

      <Text style={styles.label}>{he.auth.displayName}</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={he.auth.displayNamePlaceholder}
        autoComplete="name"
        textAlign="right"
      />

      <Text style={styles.label}>{he.auth.email}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textAlign="left"
      />

      <Text style={styles.label}>{he.auth.password}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder={he.auth.passwordPlaceholderRegister}
          secureTextEntry={!passwordVisible}
          autoComplete="new-password"
          textAlign="left"
        />
        <TouchableOpacity
          style={styles.visibilityButton}
          onPress={() => setPasswordVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? he.auth.hidePasswordA11y : he.auth.showPasswordA11y}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.gray600}
          />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{he.auth.registerButton}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>{he.auth.hasAccount} </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text style={styles.linkAction}>{he.auth.loginLink}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  )
}

export default function RegisterScreen() {
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError('')
    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) {
      setError(he.auth.nameRequired)
      return
    }
    if (!trimmedEmail) {
      setError(he.auth.emailRequired)
      return
    }
    if (!password) {
      setError(he.auth.passwordRequired)
      return
    }
    if (password.length < 6) {
      setError(he.auth.passwordMinLength)
      return
    }

    setLoading(true)
    const result = await signUp(trimmedEmail, password, trimmedName)
    setLoading(false)

    if (result.error) {
      const key = result.error as keyof typeof he.auth
      setError(he.auth[key] ?? he.auth.genericError)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{he.auth.welcomeTitle}</Text>
          <Text style={styles.subtitle}>{he.auth.welcomeSubtitle}</Text>
        </View>

        <View style={styles.card}>
          {Platform.OS === 'web' ? (
            <form
              style={webFormStyle}
              onSubmit={(e) => {
                e.preventDefault()
                void handleRegister()
              }}
            >
              <RegisterFields
                displayName={displayName}
                email={email}
                password={password}
                setDisplayName={setDisplayName}
                setEmail={setEmail}
                setPassword={setPassword}
                error={error}
                loading={loading}
                onSubmit={handleRegister}
              />
            </form>
          ) : (
            <RegisterFields
              displayName={displayName}
              email={email}
              password={password}
              setDisplayName={setDisplayName}
              setEmail={setEmail}
              setPassword={setPassword}
              error={error}
              loading={loading}
              onSubmit={handleRegister}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.gray500 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.gray800, marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: colors.gray800,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingInlineStart: 14,
    paddingInlineEnd: 6,
    fontSize: 16,
    color: colors.gray800,
  },
  visibilityButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { color: colors.red500, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: colors.gray500 },
  linkAction: { fontSize: 14, color: colors.primary, fontWeight: '700' },
})
