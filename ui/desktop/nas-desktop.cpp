#include <QApplication>
#include <QWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QLabel>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    QWidget window;
    window.setWindowTitle("NAS-PRO Desktop (FAZA 7)");

    QVBoxLayout *layout = new QVBoxLayout(&window);

    QLabel *title = new QLabel("NAS-PRO SYSTEM DESKTOP");
    QPushButton *launcher = new QPushButton("Open Launcher");
    QPushButton *files = new QPushButton("File Manager");
    QPushButton *terminal = new QPushButton("Terminal");
    QPushButton *exitBtn = new QPushButton("Shutdown");

    layout->addWidget(title);
    layout->addWidget(launcher);
    layout->addWidget(files);
    layout->addWidget(terminal);
    layout->addWidget(exitBtn);

    QObject::connect(exitBtn, &QPushButton::clicked, &app, &QApplication::quit);

    window.resize(600, 400);
    window.show();

    return app.exec();
}
