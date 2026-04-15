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

function LoginFields(props: {
  email: string
  password: string
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  error: string
  loading: boolean
  onSubmit: () => void
}) {
  const { email, password, setEmail, setPassword, error, loading, onSubmit } = props
  const [passwordVisible, setPasswordVisible] = useState(true)
  return (
    <>
      <Text style={styles.cardTitle}>{he.auth.login}</Text>

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
          placeholder="••••••"
          secureTextEntry={!passwordVisible}
          autoComplete="current-password"
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
          <Text style={styles.buttonText}>{he.auth.loginButton}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>{he.auth.noAccount} </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.linkAction}>{he.auth.registerLink}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  )
}

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError(he.auth.emailRequired)
      return
    }
    if (!password) {
      setError(he.auth.passwordRequired)
      return
    }

    setLoading(true)
    const result = await signIn(trimmedEmail, password)
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
                void handleLogin()
              }}
            >
              <LoginFields
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                error={error}
                loading={loading}
                onSubmit={handleLogin}
              />
            </form>
          ) : (
            <LoginFields
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              error={error}
              loading={loading}
              onSubmit={handleLogin}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const webFormStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
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
