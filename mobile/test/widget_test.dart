import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signa_mobile/main.dart';

void main() {
  testWidgets('App renders CivicSignalApp title test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: CivicSignalApp(),
      ),
    );

    expect(find.text('Signa.ci'), findsOneWidget);
  });
}
