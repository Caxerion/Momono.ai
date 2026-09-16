import 'package:flutter/material.dart';

import 'login_screen.dart';

void main() {
  runApp(const MomonoApp());
}

class MomonoApp extends StatelessWidget {
  const MomonoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Momono',
      theme: ThemeData(
        colorScheme: .fromSeed(
          seedColor: const Color(0xFFFF6B35),
          brightness: .dark,
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

// Entry point: login flow -> discover -> chat
