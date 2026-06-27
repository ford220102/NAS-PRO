#include <QApplication>
#include <QWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QLabel>

class Desktop : public QWidget {
public:
    Desktop() {
        setWindowTitle("NAS-PRO SYSTEM UI");

        auto *layout = new QVBoxLayout(this);

        QLabel *title = new QLabel("NAS-PRO SYSTEM UI CORE");
        QPushButton *fileManager = new QPushButton("File Manager");
        QPushButton *terminal = new QPushButton("Terminal");
        QPushButton *settings = new QPushButton("Settings");
        QPushButton *shutdown = new QPushButton("Shutdown");

        layout->addWidget(title);
        layout->addWidget(fileManager);
        layout->addWidget(terminal);
        layout->addWidget(settings);
        layout->addWidget(shutdown);

        connect(shutdown, &QPushButton::clicked, qApp, &QApplication::quit);
    }
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Desktop d;
    d.resize(900, 600);
    d.show();

    return app.exec();
}
