import 'package:flutter/material.dart';

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Discover')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Halaman Discover (placeholder).\nToken tersimpan: ${token.length > 12 ? '${token.substring(0, 12)}...' : token}',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}