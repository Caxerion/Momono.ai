import 'package:flutter_test/flutter_test.dart';

import 'package:momono_mobile/main.dart';
import 'package:momono_mobile/login_screen.dart';

void main() {
  testWidgets('login screen shows username and password fields',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MomonoApp());

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });
}