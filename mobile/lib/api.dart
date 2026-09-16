import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

class ApiClient {
  static String? token;

  static Future<String> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiBase}/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Login gagal (${res.statusCode})');
    }
    token = data['token'] as String?;
    return token ?? '';
  }
}