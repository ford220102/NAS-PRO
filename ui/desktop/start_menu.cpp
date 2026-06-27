#include <QWidget>
#include <QPushButton>
#include <QVBoxLayout>
#include <QApplication>

class StartMenu : public QWidget {
public:
    StartMenu() {
        setWindowTitle("Start Menu");

        QVBoxLayout *layout = new QVBoxLayout(this);

        QPushButton *apps = new QPushButton("Apps");
        QPushButton *files = new QPushButton("File Manager");
        QPushButton *settings = new QPushButton("Settings");
        QPushButton *shutdown = new QPushButton("Shutdown");

        layout->addWidget(apps);
        layout->addWidget(files);
        layout->addWidget(settings);
        layout->addWidget(shutdown);

        connect(shutdown, &QPushButton::clicked, qApp, &QApplication::quit);
    }
};
